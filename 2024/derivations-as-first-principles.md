---
# System prepended metadata

title: Derivations as First Principles
lastmod: 2024-12-04
---

# Derivations as First Principles

My last exploration was useful but still imperfect. It put too much on diffing. Trello example shouldn't have to diff the results everytime it does a mutation, only when the underlying board updates from the server. So I'm going to take another stab at it. and it starts with recognizing a potential symmetry.

```jsx
// immutable atom
const [todo, setTodo] = createSignal({ id: 1, done: false });

// next = fn(prev, event)
setTodo(todo => ({ ...todo, done: true }));

// mutable proxy
const [todo, setTodo] = createStore({ id: 1, done: false });

// mutate(current, event)
setTodo(todo => { todo.done = true; });
```

Deriving takes the same form as the set function.

```jsx
// immutable
const todoWithPriority = createMemo(todo => ({ ...todo, priority: priority() }), initialTodo);

// mutable
const todoWithPriority = createProjection(todo => { todo.priority = priority(); }, initialTodo);
```

And same with "writable" variants.

```jsx
// immutable
const [todo, setTodo] = createWritableMemo(prev => props.todo);

// mutable
const [todo, setTodo] = createWritableProjection(todo => reconcile(props.todo, todo); });
```

Excuse the naming here. I intentionally gave derived signal/stores different names so you can see they are different throughout. And part of me wonders if `writable` prefix is as obvious for the intent as just calling it a derived version of the source. Ie.. `derivedSignal` or `derivedStore`.

This is the fundamental difference between Signals and Stores. And between Memo's and Projections. And it has significant impact how these primitives are used. Immutable change always constructs the next state, and mutable change mutates the current state into the next state. Immutable change is consistent in its operations, as it just needs to build the next state regardless of what changes. Mutable may have different operations depending on the change. Immutable change always has the unmodified previous state to work with while mutable change does not (leads to some edge cases with shared data when using things like `reconcile`).

## Diffing Revisited

We are pretty good with immutable derivations. I think mutable derivations are underexplored. The challenge is these APIs for deriving generally involve a single function that re-runs on update. Since you aren't staying with the same source state like one would with immutable data and the whole goal of of using these mutable structures is more granular(incremental) change without diffing, how would this function ever do different things?

Well the first option is it doesn't.

```jsx
// immutable
const todoWithPriority = createMemo(todo => ({
  ...todo,
  priority: priority(),
  title: title(),
  done: done()
}));

// mutable
const todoWithPriority = createProjection(todo => { 
  todo.priority = priority();
  todo.title = title();
  todo.done = done();
});
```

You could have a set routine similar to immutable. But is this really not diffing? Each value has a previous value and when you set it again it sees it is equal and doesn't notify. Yes only on specific change will it notify so it does the trick, unlike `createMemo` which will see it as a new `Todo` every time. But it is a shallow diff of sorts. 

The fact that this is diffing gets even more obvious the deeper the data goes. How would you granularly update an array. You might create a new array of the same objects, you might try to alter the existing array by looking at the indexes and comparing the values. You have to be careful the order you do stuff because once you mutate part of this data structure there is no previous state that you are looking at anymore. If you wanted to keep it around you'd need to deep clone it.

So ideally when incremental changes happen your computation function would do different things. Which means the sources need to be incremental. Now don't get me wrong I'm not saying we force this, more that it only makes sense to use certain primitives when certain conditions hold. If you have some sort of derived mutable thing ideally what would cause it to update was some set of mutations it needed to apply.

If we brought back our Trello example we'd want the computation to:

```jsx
const realizedBoard = createProjection((prev) => {
  const prevTimestamp = prev.timestamp || 0;
  prev.timestamp === Date.now();

  // check if there is no prev state
  // or this triggered because of the board updating
  if (!prev.notes || updatedSinceLastRun(board)) {
    // immutably update board + mutations then reconcile
    reconcile(applyMutations([...board()], mutations())(prev)
    return;
  }
  // modify prev state directly with new mutations,
  // no cloning/diffing
  applyMutations(
    prev.notes,
    mutations()
      .filter(mut => mut.timestamp > prevTimeStamp)
  );
});
```
Notice we aren't using diffs here in the Signia sense. We just need to know if the board triggered the computation. If so we do the reset and force the reconcile otherwise we just take our mutations and filter them to apply new changes. In a sense diffing our list of mutations is another step of indirection. The easiest way to produce different logic here is filtering of instructions. You need to communicate the instructions anyway wand communicating the diff is just extra overhead.

This a lot simpler solution and it is more performant than the ones we've looked at so far.

## Why Derive?

Too early to pat ourselves on the back. I think the first thing people think when looking at this is why can't I just use `createEffect` or `createComputed` as I have been. Every time I go back here I feel I get a firmer grasp on why derivations and correctness are important.

Lazy derivations are the first thing:

```
A   B
|   |
|   C
 \ /
  D
```

If `A` and `B` update they both notify down to `D` and so that when it runs it knows that `C` has potentially changed when so it makes sure to run it before calculating its value. But if we break that chain then it is possible for `D` to run twice once with the previous value of `C` and once with the updated.

How do we keep that chain? Assign the computation to a readable value. `createEffect` might track dependencies but doing write doesn't tell the Signal it depends on it.

```jsx
const [C, setC] = createSignal(0);

// the effect depends on B, C doesn't know it does
createEffect(B, (B) => {
  setC(B);
});
```

There is another problem. What if `B` is async? Yes the effect will wait until it is present to `setC`, but `D` will never know it has an async dependency. This means it will never Suspend if it is a different part of the UI. Or it might cause higher Suspense boundaries to trigger than it would normally. Suspense works off finding nearest reactive owner to the effect which finds itself waiting on async. Instead of where it is ultimately being read `D`, we'd be triggering it where `C` lives.

## Everything is Potentially Reactive with Colorless Async

So like reactivity, async in our model relies on keeping derivations clean. But it is more than that.

### `onMount`

Consider the difference between:
```jsx
createEffect(() => untrack(data), console.log);

// vs

onMount(() => console.log(data()));
```

The first thing you might be thinking is if it is an effect that doesn't update we've untracked the read it is basically the same as `onMount`. But is it?

It depends on how it is implemented. My first inkling is `onMount` would be:
```jsx
function onMount(fn) {
  createEffect(() => {}, fn);
}
```
You have nothing to do in the "pure" phase and you just tag this on with the other side effects. This is a subtle difference from `untrack`ing `data` in the pure phase like I've shown above. 

What if `data` is async? Now one could argue that it should behave the same. But my if the pure side of an effect can't run to completion it needs to run again until it does because there could be other tracked things after. Which means that the async dependency is a temporary one until it runs without throwing. 

So the difference is the effectful side will run once when the data is loaded the first time `console.log`ing the loaded data. And the `onMount` will error out without logging. It has no reactive context to re-run. 

This is another argument for splitting effects. You can't interrupt effectful part of effects without erroring because they could have already affected the world. It's also an argument for why `onMount` is an undesirable primitive to have since it might lead people to make this mistake.

Or it might be an argument for warnings when reactive data is accessed under certain `untrack` context like I showed on my Strict Mode stream.

### Deriving Signals from `props`

Now Consider the difference between:

```js
const [count, setCount] = createSignal(props.count);

// vs

const [count, setCount] = createWritable(() =>
  untrack(() => props.count)
);
```

You might look at this and think, well they are the same. If a writable is never going to be reset from above then it's like initializing a Signal with that value.

But what if `props.count` would become async at some point? Well now in a sense it is a reactive value you care to listen to now. You wouldn't want the count to initialize as undefined if you expect it to be number. 

In fact with `createSignal`, we would throw here if the async resource underlying `props.count` had never resolved. And throw all the way up to the nearest decision point. Upon resolution it would re-render the whole branch from that decision.

Whereas with `createWritable`, it would catch the promise itself and do nothing until it was read where it was used. Upon resolution it would push the data and only re-run the specific places `count` was used.

This is a drastic difference in behavior. Enough that in the same way Components `untrack` top level you almost want to make Components not participate in throwing top level. But given the goal is to be able to have a single idiomatic way of writing your code it might be better just to treat our ESLint rules as gold. Today `createSignal(props.count)` will shout at you. Maybe top level reactive access in components should be forbidden even from a runtime level like I did on the Strict Mode stream. If you want to opt into it you need an explicit `untrack` and then `untrack` would make sure not to re-propagate any async throws and treat them as an error.

I hope you see why I am less thinking these as `writableMemo`s and more as `derivedSignals`. Because when you go to make a Signal in your component based on props my hunch is you are less thinking `Memo` as much as thinking `Signal`.

```js
const [count, setCount] = createDerivedSignal(() => props.count);
```

Don't get me wrong. People will overuse this but it is a clear answer instead of reaching for `createEffect`. Want to create Signal that is based on a prop? Use a Derived Signal.

## Conclusion

I think the biggest thing here is that there appears to be a consistent model out there, but it leads us to writing our code differently than today. Similarly to the splitting of effects into tracking and side effect parts. I don't think people will generally be stoked about that, but it not only enables things we couldn't do before, it actually is an explanation for why certain things worked inconsistently before. It highlights implicit assumptions we made that aren't safe to make. It is a corrected model, but pragmatically our industry has learned long and hard that you don't fix what isn't broken, as it will always lead to misery.

The message to treat everything as potentially Reactive has been our assumed mantra for years. It was an intuition I had when I created Solid with a focus on naked functions but over time it has crystalized into explicit rules we can follow. This exploration suggests that it is principle that can guide us through the most challenging problems.

