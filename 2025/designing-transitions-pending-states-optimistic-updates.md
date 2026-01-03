---
# System prepended metadata

title: Designing Transitions - Pending States/Optimistic Updates
lastmod: 2025-08-25
---

# Designing Transitions - Pending States/Optimistic Updates

Ok I'm at it again. It has been a while. Since the last time I looked I've explored a lot of things and this now I believe is the last topic (other than a different hydration technique). I've looked at Stores, Projections, Async models, Firewalls, Pull Based SSR and have had time to play with stuff and refine APIs.

A while back I was looking at designing Transactions but I've decided to return to the Transition name again because these aren't truly Transactions. They aren't completely isolated. There is no idea really of rollback or forcing order. Someone could make a solution like that. But for our purposes I'd rather think that parts of the graph that converge become part of the same Transition.

## First Designs

First thing I want to look at was API and I think we can slim stuff down considerably from 1.0. Mostly I don't think it is our job to manage the pending states. The second consideration is I want this mechanism to be a way of supporting View Transitions. People might use a Transition to to describe a state change they want applied even if it isn't async and have the ability to get in there before rendering to snapshot.

With that in mind my original thinking was the ideal Transition API is:
```js
function transition(
  () => void,
  () => void
): void;
```
A couple things to note. First I went with just `transition` because we tend to do that for verb operators in Solid. Secondly, I'm using a callback instead of `await`. I want to be able to call the callback synchronously during queue execution. We should call it before we run effects including rendering (although offscreen rendering will have already occurred by this point). This way if we need to add more state updates at the end of the Transition before rendering we can. `await` would force this on the microtask queue.

```js
const [isPending, setPending] = createSignal(false);


function doSomeAction() {
  // sent pending state to true and render it on the next cycle
  setPending(true);

  transition(() => {
      // navigate to the next page, but isolate this in a Transition
      // we will render this offscreen on the next microtask
      setTab("b");
    }, () => {
      // set pending to false before rendering
      setPending(false);
    }
  );
}
```

That being said this might not be worth having a double callback form for. We could also use await if we really have no other reason to hook in. I was thinking View Transitions originally but we probably will want another view tree based mechanism for this. To handle other sorts of of non-Transition things. Especially remove Suspense fallbacks.

## Looking at React

It's worth noting React has `useOptimistic` which is like ephemeral state. It handles all pending states around transitions. Converting it to equivalent Solid would be something like:

```js
const [isPending, setPending] = createOptimistic(false);

transition(() => {
  setPending(true);
  setTab("b");
})
```
It would automatically reset to the base value when the Transition ends. You can also make the base value derived and do immutable overrides:

```js
const list = createAsync(() => fetchTodos());
const [listWithOptimistic, addTodo] = createOptimistic(
  () => list(),
  (state, newTodo) => [...state, newTodo]
);

transition(() => {
  addTodo(newTodo);
  saveTodoToDB(newTodo);
});
```
It's not bad other than it decides immutability for you. I suppose if you assumed Projections here and automatic diffing on source update it does make a decent shape:

```js
const [listWithOptimistic, addTodo] = createOptimistic(
  () => list(),
  (state, newTodo) => state.push(newTodo)
);
```
The key to this though is knowing when the Transition ends to clear the state.. which is why the setter is called inside the Transition. It registers it.

I see 2 benefits of this API. It seperates the 2 halfs in a way that makes the logic seem simpler. It hides the implicit diffing. Secondly it turns optimistic updates back into events, it doesn't assume you want the FormData etc... you decide. It also doesn't care the shape. You can merge it with the actual list or keep it of a list of just optimistic things. You can have one handler with multiple message types or one handler per type.

The biggest question is, as always, is there a more basic primitive here to just handle the optimism without the projections. In reality in Solid you'd almost never want the immutable form for anything with any depth. Basically if you far enough to have a diff function you want projections. So maybe that is the stance. No incremental function assume (derived) signal with a value swap. Incremental Function automatically Projection.

Secondly these are localized. Our current API has this nice benefit of being declared global. I guess our `action` API could still work that way. I don't see anything here that is component specific for the non-derived case. Like if you wanted a list of optimistic updates:


```js
const [optimisticOnly, addItem] = createOptimistic(
  [],
  (state, newItem) => state.push(newItem)
);
```
This could easily be global tied to a specific action type assuming you could filter the list out.

## Managing Errors

This all works pretty nicely for the happy case but how do we see errors. Things on the read side naturally error where they are used. Things on the write side have no such ownership. I don't know it is the responsibility of optimistic updates to contend with that, but historically they have for us.

I think the answer is most of the time you don't want to upend the rendering so the key to this is actually in how you manage the return value from the action itself.

```js
transition(async () => {
  addTodo(newTodo);
  try {
    await saveTodoToDB(newTodo);
  } catch (error) {
    setErrors(s => [...s, {error, text: newTodo}]);
  }
});
```
Basically when something errors, it is no longer optimistic. This does suggest at minimum that progressively enhanced forms will need their own state hook to inject the errors. So like `useSubmission` (equivalent to React's `useActionState`) doesn't just go away, but it takes away a lot of pressure on managing the same of non-progressive cases. And I suspect this sort of stuff belongs more in the router than in the core.

## 2 Patterns for Async Data

It's interesting in that `createProjection` enables this so well if we had a mechanism like this people might not even use Projections directly as much. The nice thing that I see is generally speaking state updates are events and this moves the exercise of processing optimistic state the same way.

So one might without Transitions use this pattern a lot:

```js
const data = createAsync(() => fetchData(props.id))
const [store, setStore] = createStore(s => reconcile(data())(s))
```
This diffs the data whenever it comes from the server but then you are free to override it as much as you want. It's basically the granular equivalent of a derived signal. This technically has optimism built in but when and how you save that data is up to you. It is very client-centric thinking.

Conversely with transitions you might:
```js
const data = createAsync(() => fetchData(props.id));
const [store, mutate] = createOptimistic(data, (s, message) => {
  // mutate s with instructions from mutate
})
```
You've seen this before it is a reducer. The difference here is the lifetime of the ephemeral state is set by the Transition that uses the `mutate` function. Basically you can't update the store without also scheduling the Transition that refreshes the data. It is a much more constrained pattern but it automates a lot of the pieces. Both approaches use Projections under the hood but the latter is more guided approach.


<details>
    <summary><b>Should all Projections look like this?</b></summary>
It is interesting thought experiment to try to decide if all Projections could take this shape. Like selection could:

```js
const [isSelected, select] = createProjection({}, (s, selectedId) => {
  if (s.previous != null) delete s[s.previous]; 
  s[selectedId] = true;
  s.previous = selectedId;
});

// set
select(12);

// read
isSelected[12]
```
This doesn't derive from anything so it never resets. So it does work. What is missing in all these examples is the implicit diff means that diffing options must be set on the top level primitive.
    
The interesting detail here though is directionality. It assumes all incremental updates come from events and are not derived. So in cases where this is true that works well. In cases where it is not we don't have a solve. Like how do you set the state, in an effect? You can always take a pattern that involves derivation and inject a new setter but it is harder to do it the other way.

The other challenge is when do the incremental parts go away. When we made stuff like Strello demo we needed to use timestamps. Transitions automate it because they know they don't return until everything is processed. But here we could be in a half and half state. Having more applied state than is represented in the reset value.

In so I think Projections are useful as the more general primitive. I think that the shape of optimistic is really nice for those sort of cases, and could be used outside of optimistic updates if you had a way to store and clear incoming mutations. Because a more naive approach (like below) is going to have issues unless you account for what has been applied vs not.

```js
function createIncremental(source, incrementalFn, options) {
  const [mutation, setMutation] = createSignal();
  const proj = createProjection(s => {
    let data;
    if (hasUpdated(() => data = source())) {
      reconcile(data, options.reconcileId)(s);
      return;
    }
    incrementalFn(s, mutation());
  }, {})
  return [proj, setMutation]
}
```
</details>

## Conclusion

So I think this is pretty cool. I think React did a good job here of unifying ephemeral state both in terms of pending and optimistic updates for Transitions and honestly once again I'm pretty compelled to follow suit here.

I think the fact this makes the Strello demo dirt simple with the same behavior we enjoy today is a nice win.

```js
const board = createAsync(() => fetchBoard());
const [boardWithMutations, optimisticMutate] = createOptimistic(
  board,
  (state, mutation) => {
    if (mutation.type === "ADD") { ... }
    else if (mutation.type === "REMOVE") { ... }
    else if // so on...
  }
);
```
It's a nice behavior over projections that takes care of the tricky parts like race conditions and managing timestamps etc... So I'm for it. I still need to recreate Transitions themselves, and I think there are some details around progressive enhancement that need review, but directionally this feels good as it fully leverages Solid's ability to not re-render but it makes the logic feel simple.