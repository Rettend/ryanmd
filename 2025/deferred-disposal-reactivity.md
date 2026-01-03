---
# System prepended metadata

title: Deferred Disposal Reactivity
lastmod: 2025-11-06
---

# Deferred Disposal Reactivity

Not really the catchiest name. Should I call this concurrent Signals? Bottom-line in the same way we have been challenging Svelte to rethink their reactivity model. Svelte has pushed me to rethink the limits of what can be done without a compiler. Svelte's compiler has accomplished what I previously thought impossible approach to removing boundaries around concurrent async.

Now that I see it I think there is a path forward to build the core reactivity runtime to just behave this way. But the overarching question is can we create a system of this type and not impact normal sync performance too detrimentally.

The premise here is 2 fold. Defer committing values and defer disposal until commit. Delayed commit is pretty easy to see it work. There is tons of prior art from Solid 1.0's original batch function to well React. But does deferred disposal really work?

Well the first problem you hit is:

```js
const [a, setA] = createSignal(0);
const [b, setB] = createSignal(0);

const order: string[] = [];

createEffect(() => {
  order.push("outer");
  a();
  createEffect(() => {
    order.push("inner");
    b();
  }, () => {})
}, () => {})


flush();
expect(order).toEqual(["outer", "inner"]);

setA(2);
setB(2);
flush();

expect(order).toEqual(["outer", "inner", "outer", "inner"]);

// unfortunately we get ["outer", "inner", "outer", "inner", "inner"]
```
A naive approach of deferring disposal would have inner effect execute an extra time, because it isn't released at the time of flushing the pure queue. Basically each runs once at first, then on update when the outer effect re-runs it doesn't dispose of it's inner effect like it typically would and instead puts it aside for disposal and then creates a new inner effect and runs the pure side. Now as it continues to drain the queue it hits the original and runs it as well.

Now one could argue that this push is wrong since we are making a side effect on the pure side. Sure... But the bigger point is that it runs again when normally it wouldn't. So it isn't as simple as deferring disposal.

## Marking Disposal and Isolated Queuing

I was chatting with Milo while implementing and he was like well just mark the nodes and stick them in a different queue. If no async is detected then throw away the queue and dispose and if it is then just run the queue.

Great. I mean there is some cost here because we need to traverse the nodes an additional time to mark them and have a second queue, but fairly minimal I hope. We can benchmark it. But is that enough?

To answer this question I think we need to have a plan on how merging will work. One of the benefits of cloning is once you clone you have isolated everything so it is fairly easy to keep track of the different branchs and they are all link. The downside is it is a severe upfront cost. The benefit of not cloning is it is much cheaper but the things that do conflict aren't so isolated, it is easy to accidentally blend things together.

So we should at a base lay out the different scenarios we will find ourselves in, in this design and work out what the behavior should be.

### 1. Normal Sync Operation

In this scenario nothing async occurs so this should be the simplest case. Upon write to signals we should set a pending value and queue flush. On flush we should propagate changes, setting pending values, and marking children for disposal, while queing actual disposal. This could be a queue of functions or we could keep pending fields on the node for disposal as well as value and then do it as we run through the nodes to commit.

What this scenario has in common is we never expect to run the disposed nodes again and they will all be disposed of in that immediate flush. So the details don't impact this as much.

### 2. Single Async Operation

Also should be fairly straight forward. Works the same as sync up until commit at which point we do not dispose and we actualy run the second queue. The tricky part here is how do we collect async nodes to know that it is async. In our current setup I turn throwing back on under Transition. I remove the tearing so everthing throws and then if there is no Suspense to catch it the Transition catches it. This is trickier because in the render effects we may not want to throw. This isn't a clone we could be doing a sync update and something else is pending and would throw but we don't want these to be associated.

The determination of something being async here isn't just that the effect throws at the end. But it is also not enough to say there is something that throws along the path because where it ultimately gets read does matter. So we have to make this determination at the end, at the effects, but throwing is insufficient. If we read a value that is pending NotReady then we need to also mark this, but only if it isn't under a new Suspense boundary.

So it feels like we we still need to do the notification bubbling here but then the Suspense needs to determine if it cares.. ie if it isn't due to a throw it can ignore it? Although actually maybe it shouldn't. A new Suspense boundary with old pending Async should also suspend to prevent the fallback then random update issue. An existing Suspense will ignore both under a Transition so that is probably the tact we take. We just notify in both cases. The fact that everything is a Transition effectively is nice here because it means Suspense will never go back to fallback. Like do something async and trigger a lazy component, no problem.

This actually solves I think a lot of the Anti-Suspense crowd's issues because they don't need to be aware it exists. They can place Suspense and there is no fear of it ever triggering again. Honestly this makes me wonder if we can clean it up. Make it emphemeral.

### 3. Async update after Async Update

First of the more complicated cases. But probably next in the list. I guess there are 2 scenarios here, when they entangle and when they don't. Arguably though when they don't it is the same as Single Async Operation above. So the important first part of talking through this is figuring out the criteria for entanglement.

I think it is actually pretty easy. Again probably needed to be handled by some sort of psuedo global, but if you update a signal or computation as propagate and it's value is already pending then we are entangled if this leads to async at the end. So we need to just detect this case, and then wait until the end to make a decision. That being said there are cases where like a 3rd transition could merge with 2 previous, so we have to take note of which ones would merge. I think the pending check is fair because any previous sync operation would no longer be pending. So this is only an async after async scenario.

Now with multiple async in flight what does disposal look like? With cloning you know you clone at that moment in time so we just don't clone disposal and everything works naturally. Here we hold disposal at first, but should we just keep forking it? We only need to in theory save disposal for what is currently on screen, but we have no way of determining that. We do know if the new change is async though and entangles it won't be on screen, so any current disposal(different from previously pending disposal) on pending nodes can be disposed immediately. You just need to leave the pending disposal there. The trickiest part of this is that we don't know for sure if things will be async until the end.

But that might not matter. The thing is if it resolves sync or it entangles we know we can dispose these nodes immediately. It is only if it forms it's own transition that we can't. If it sees a pending value already then we know it is going to be one of those 2 cases, because if it is async and sees a pending value it will entangle, and if it is sync it is safe to dispose. So I guess we are ok just putting extra fields on the node. For pending disposal.

### 4. Sync update after Async Update

This is probably also a trickier case. If it doesn't overlap nothing interesting happens here and we continue. But what if it does? In most cases this will lead to downstream async, but let's pretend it is a case that doesn't. Like this scenario:

```jsx
const [a, setA] = createSignal(0);
const [b, setB] = createSignal(0);
const c = createAsync(() => fetchSomething(a()))

return <>
  <button onClick={() => {
    setA(a => a + 1);
    setB(b => b + 1);
  }}>Both</button>
  <button onClick={() => {
    setB(b => b + 1);
  }}>Sync</button>
  {a()} {b()} {c()}
</>
```
This situation is funny because it time based entanglement the only reason b doesn't update, but then we go and update B anyway independently. In this case we would just update the pending value, but we are also safe at the end to dispose of anything related to b. This isn't perfect because b is a signal so it doesn't own anything but let's just play along.

I think this means that we can keep references on the node and if there is work to be done then at the end when async settles it is done, otherwise it isn't. Having them not be forked actually simplifies this a lot.

## Conclusion

I think this suggests a data structure that actually just adds `pendingValue`, `pendingChildDispose` and `pendingDispose`. Not unlike the `tValue` etc we have in 1.0. I just think I understand the rules better this time. So I guess this is what we build and we give it a try in the benchmarks.