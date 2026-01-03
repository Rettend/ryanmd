---
# System prepended metadata

title: Reflecting on Push-Based Signals
lastmod: 2025-07-23
---

# Reflecting on Push-Based Signals

Milo came to me a couple weeks back with a really novel idea. He had come up with an approach to do Push-Based Signals. You might be asking yourself why would I want that? Afterall, we have established that push-based lacked the information to prevent cycles.

Well what if it didn't? The benefit of push-based is it is infinitely simpler. Instead of Push-Pull-Push which is essentially what Push-Pull is these days it would just be Push. You wouldn't have to traverse the graph 3 times to get an update. Just once.

As it turns out this approach unsurprisingly seems faster than even Alien Signals. It also natively supports correctness for things like Projections drastically simplifying how they propagate.

But is this a world we can live in?

## Understanding the Basics

Push-based means eager for the most part. Which given where Solid has been isn't that far from it today. Yes we've been working on lazy systems for 2.0 but in a lot of ways push is closer to Solid 1.0's eager system.

The way it works is it sorts everything based on depth of depedendencies. So your depth becomes +1 of the largest depth of dependendency you have. And the same trick can apply even to ownership where you are +1 of your parent (or the maximum between that and your largest dependency).

![depth map](https://hackmd.io/_uploads/SJZW3YQZgg.png)

Then when an update occurs it just walks down once executing and only queueing on the immediate observers when it confirms it has changed. Things just shortcut by not running.

You can see that while there are multiple `2`s in the graph since they don't depend on each other there is no concern for what order they run in. And it is not possible to run anything before its dependencies have run.

So far so good. But why hasn't anyone done this before? This works great for fairly fixed graphs. But dynamic dependencies can cause depths to change. Something can find itself needing a value from something lower down that hasn't be evaluated yet. If I'm running level `1` and suddenly I now depend on something from level `4` that value won't be up to date potentially. And I won't even know if could be out of date because we don't notify possible change in push-based system.

One way to do this is model the whole system as continuations. In fact this model is based off Jane Street's Incremental which does just that. You could use something like Promises to pause execution and then pick it up when it is ready. Promises in JavaScript have 2 issues here though.. They are always async which is awkward thing to do on every read, and there is no ability to re-inject our context on resuming them.

So there is a solution for that in JavaScript. Generators. But they are super clunky. Another option is what we are doing with async with throwing and re-executing that node but that doesn't completely help us because downstream still need to know that their depth has changed because of this so there is a bit of a ripple effect of nodes running and realizing they are deeper than they should be and throwing.

So Milo came up with a simple solution. Fallback back to Push-Pull-Push at this point. The Queue knows exactly what is dirty and just notify from there downward that way when we read something that could be not ready we know and we can evaluate it as needed. This won't queue effects so it doesn't pull from the bottom but from where the value is used. Still at worst this approach is comparable to the best Signals solutions today, and is probably even still a bit better.

If depth only ever grows and never shrinks then while the queue might have more levels it will generally stabilize over time and the next time these dynamic dependencies come in they will get the optimal performance.

## Consequences

So in a sense this is just a big optimization in terms of simplicity and performance but it isn't without tradeoffs.

1. Nodes run eagerly. Umm.. honestly probably not a big deal given my experience in Solid 1.0. Ownership keeps most things alive as much as needed and this approach could opt in to laziness (just force the fallback) where it is really needed.

2. Writing to nodes above during reactive propagation is just broken. Ie you can't do it. So no writing in Memo's etc.. This is fairly easy to detect thankfully since if you give Signals a Depth based on ownership if the level is more than 1 less, it errors. Stores might have some challenges giving Signals Depth mind you.

3. Nodes don't notify by default so randomly reading a value isn't guarenteed to be up to date. This requires some design thought so I am going to dedicate the next section to this.

## Working in Non-Notifying World

Inside the reactive system everything works well because it has to. It executes in order so nothing is ever out of date. So our concern has to be when we are working outside of the reactive system.. ie in events and side effects.

The classic example here is:
```js
const [count, setCount] = createSignal(0);

const doubleCount = createMemo(() => count() * 2);

let ref;

return <button ref={el} onClick={() =>{
  setCount(1);
  console.log(count(), doubleCount(), ref.textContent)
}}>{doubleCount()}</button>
```

In Solid today this results in `1, 2, 2`. In React it is `0, 0, 0`. And with Vue and Svelte it is `1, 2, 0`.

I was on team `1, 2, 0` for 2.0 with lazy evaluation but a push based system makes things a bit trickier. Now it isn't hard to handle one level of derived since marking the Signal as dirty will automically mark `doubleCount` but if there were more layers in between `doubleCount` woudn't know if it were dirty and return the old value.

Essentially you'd end up with `1, 0, 0` which is Svelte's old model and arguably the worst of them all. Now there are options here but they all have tradeoffs.

### Immediate

First we could just keep Solid 1.0's treatment and keep the `1, 2, 2` Everytime we set a signal we run the whole thing unless it is in a `batch`. As we know this generally isn't that bad. The tricky part is how to handle effects.  In 1.0 we just batch the effects. Unlike 1.0 we don't know if we had the same code if `doubleCount` has updated. 

To be fair with split effects maybe we shouldn't be reading from reactivity on that side.

Ie..
```js
createEffect(inputSignal, () => {
  setCount(1);
  console.log(count(), doubleCount(), ref.textContent)
})
```
Should be written:
```js
createEffect(inputSignal, () => {
  setCount(1);
})

createEffect(
  () => [count(), doubleCount()],
  ([count, double]) => console.log(count, doubleCount, ref.textContent)
);
```
And even more ideally:
```js
const count = createMemo(() => fn(inputSignal()));
const doubleCount = createMemo(() => count() * 2);

createEffect(
  () => [count(), doubleCount()],
  ([count, double]) => console.log(count, doubleCount, ref.textContent)
);
```

So what this really comes down to is what the `batch` behavior is. It is pretty difficult to not have batch behavior inside the effects loop. In an event at minimum we need to batch the effects otherwise whats the point. But if we batched the updates we end up with the undesirable Svelte 3 behavior.

Of course we could take a page from React and just not update. Classicaly in Solid pre-1.5 we used to keep values in the past when batched and that was pretty consistent. Afterwards we moved to essentially the Vue behavior, asking on demand.

However if we were to keep that in this system we'd need to run all pure reactivity on every update. Sure we could schedule side effects but we'd be stabilizing the graph in real time immediately. Ie.. only batching the next round of effects.

The cheeky middleground might be to only stabilize on demand. Ie.. only if you read a computation do you stabilize all computations when in a `batch`. So people doing reasonable things never hit this and people doing weird things take a bigger hit than if we fine-grained determined values but that's on them.

But this does ask if there is another model.

### Always Defer Effects

What if instead of only in `batch` but always took that stabilization approach. That on any read outside of pure queue execution we try to stabilize the graph. But we always batch effects so there is no `batch` helper.. We keep `flushSync` helper for when you want to batch side effects immediately.

It'd look a lot like what we are doing right now in 2.0 from the outside. There would be more work done in those read after write scenarios but probably not that big of a concern.

### Keep Values in the Past

I had to mention it no matter how unpopular it is. This might be the simplest way to handle things especially if we consider how in effects this read after write is sort of anti-pattern. That being said since it still sends you to `flushSync` it probably isn't really any better than defering only effects unless you are worried that the updated graph is too expensive.

Overall on this topic I feel more likely to want to keep the 1.0 Solid API with `batch` batching updates and effects, with early read triggering updates. It feels more natural and could behavior fairly optimally if people don't read after write. But the `flushSync` approach is fine too. I've just feel the balance has slightly shifted. 

## Opt In Lazyiness

I don't know. I feel like I'm still missing stuff. Like if nodes opt in to be lazy then how do they play with this stabilization graph. The perfect example is I think `children` helper should be lazy. It's the one where although we can't change ownership reasonably people use it on nodes that aren't inserted and should be able to do so.

Fortunately this is primarily for DOM/rendering concerns so people generally aren't going to be reading it eagerly. But that's the thing. Once you are in an eager system the second you hook it in, it isn't lazy anymore.

A similar question might be should the memo's around control flows or fragments generally be lazy. This is less consequential but it feels like if there was a place this is where you'd do it. Basically the JSX decision points. Being lazy means it wouldn't participate in the priority queue but instead whenever it was read the rest of the graph below would get notified. I feel like we'd hit this de-opt pretty often if it was all control flow.

Alternatively we assume it is all eager and maybe make `children` more obvious in usage from an API standpoint. Like what if `children` what instead `<Children>`:

```jsx
function MyComp(props) {
  return <Children children={props.children}>
    {children => 
      <MyContext value={something}>{
         safeChildren(children)
      }</MyContext>
    }
  </Children>
}
```
I know this is clunky but it would be pretty hard to mess up ownership. You would see it is resolved above the the ContextProvider.

Instead you should:
 ```jsx
function MyComp(props) {
  return <MyContext value={something}>
    <Children children={props.children}>{
      children => <>{safeChildren(children)}</>
    }</Children>
  </MyContext>
}
```

In the end in an opt-in to lazy system. Like shortcutting equality it becomes a shallow thing. More like:

```js
const expensiveThing = createMemo(
  () => expensiveCalcution(props.something),
  undefined,
  { lazy: true }
);

return <>{showExpensive() ? expensiveThing() : undefined}</>
```
Just keep in mind once we encouter this all updates below will be notified just in case if we can't determine if it is dirty. However, I imagine in many cases the thing that makes it dirty will be above it. 

## Is `createAsync` necessary anymore?

This is an interesting question because if the pure queue is eager then what's the difference between `createAsync` and `createMemo` except a bunch of extra code to handle Promises or Async Iterables. To be fair though you accept the code size those paths would have no negative impact on normal memos because they just wouldn't hit them.

That being said there is considerations here. Like first if we did this `createMemo` wouldn't be able to hold promises without boxing them as it would assume you inteaded to wait on it. That is probably fine.

Secondly there is special serialization behavior around `createAsync` on the server. That being said every node has an id so it could still be discoverable and hitting this path is what makes it async so that is fine.

Finally there is the `deferStream` option. Which could be added to every memo but only have meaning on memo's that were async. To be fair since anything in the chain would be catching the promise it is possible to inject `deferStream` anywhere. It just might be a little chaotic without the clear dilineation.

Honestly I think it is technically possible. I don't know if it is more helpful to have better hints. But it is interesting we could live in a world where simply having async functions in `createMemo` or `createProjection` (and by extension derived versions of Signals and Stores) were just async.

Since we have decoupled the API via Boundaries and like `isPending` type helpers this is a world we could live in. Maybe there is some other unique characteristic of `createAsync` I'm not thinking of. But it is really interesting that we could live in a world with just 4 primitives (createSignal, createMemo, createStore, createProjection).

More over.. in a sense to complete the loop have Signals (and possiblly stores) return a 3rd setter that could set errored state.

```js
const [value, setValue, setError] = createSignal();
```
Because then setting and clearing `NotReadyError` could be all it would take to trigger Suspense. I don't know.. maybe that is crazy. But it is always interesting to re-examine things from first principles.

## Conclusion

That's it for now. It's a brand new idea still need to consider other implications as we get going but it is definitely interesting. It actually doesn't change any of the broad strokes for the 2.0 design. It just makes traversing updates maybe a bit more straight forward.

Milo still has more work to do to implement the idea in full but I think it is probably worth talking/thinking about.


