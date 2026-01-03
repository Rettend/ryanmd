---
# System prepended metadata

title: Effects/Events
lastmod: 2025-03-12
---

# Async Effects/Events

So we have a seemingly category of issue when looking at colorless async. Functions that have dependencies that we don't know until we run them but fall at the edge of our system.

These concepts are both similar in the sense they are a non-tracked callback that have dependencies, but also very different in where they sit. Effects tend to be exiting the system where Events tend to be entering.

> There are exceptions. Some Effects are used to read the DOM to write back into the system and are more Event-like. And some would have Effects funnel into Events that would funnel back into the system. However both of these don't end up changing what I will be talking about next much from the base expectation of these mechanisms.

And for this reason they tend to get built up differently. Effects tend to be defined in a single location either co-located where the source of the data is coming in (for things that truly live outside), or nearest to where the Effect impacts for things like DOM updates. If you want more Effects you just write another one and its sources will ensure it happens.

Events tend to be singular outside of the system so everyone who participates will want to jump on. Natively this involves bubbling, but for us this usually means composition.

```js
function Comp(props) {
  return <Child onSomething={e => {
    props.onSomething?.(e);
    // do my own thing
  }} />
}
```

So we are dealing with a very different beast. Unlike Effects at the point of consuming an Event we quite likely have no idea what it depends on.

```js
function Child(props) {
  // does `props.onSomething` read from async?
  return <div onClick={props.onSomething} />  
}
```
So we can see that while these are very similar API surfaces usage puts them in different zones.

## Effects

I don't bring the suggestion to split effects lightly. And unfortunately it is probably non-negotiable with the changes to reactivity.

```js
const a = createAsync<"a">(fetchA);
const b = createAsync<"b"> (fetchB);
const c = createAsync<"c">(fetchC);

createEffect(() => {
  console.log(a());
  console.log(b());
  console.log(c());
});
```
What does this log?

The answer is not actually a single one since async can resolve in any order. It reminds me a bit of solving for 0's in a quadratic equation.

It could be `abc` it could also be `aabc`, `ababc`, or `aababc`. Obviously `console.log` are inconsequential but it goes to the question of what sort of guarentees do we want to provide to users of effects?

For example this could always log `abc` once:
```js
const a = createAsync<"a">(fetchA);
const b = createAsync<"b"> (fetchB);
const c = createAsync<"c">(fetchC);

createEffect(() => [a(), b(), c()], ([a, b, c]) => {
  console.log(a);
  console.log(b);
  console.log(c);
});
```

Of course the developer could do this themselves but that requires always accessing up front, or knowing what is or could be async at some point in the future both of dependencies you know:

```js
createEffect(() => {
  console.log(props.a);
  console.log(props.b);
  console.log(props.c);
});
```
And those you don't know:
```js
createEffect(() => {
  doSomethingNested(store);
});
```
The latter is interesting because it could bail at any point in the middle and it isn't particularly clear.

Render Effects must be split for our model to work but User effects could avoid this if we were ok with it. So some might consider this catering to the 1% case but the problem is as soon as something goes from sync -> async it travels all the way down the line; into code you might not control; into something you imported from a 3rd party. They need to write their code in a safe way for your code to be safe.

### Split Effects Tradeoffs

Now the tradeoff of splitting is that at minimum you need to traverse things you want to access twice so that you can "track" before you "do" and often this involves resolving the value before doing the side effect. Whether that is creating an array of dependencies, or `structuredClone`ing an object.

The problem here is that the dependencies become more fixed. They aren't necessarily fixed but it becomes harder to write things that follow multiple paths because you need to do it twice and often the "effect" itself decides that. It is a fundamental problem because we can't control the nature of the execution outside of our responsibity (the effect) but we also can't provide guarentees unless given the opportunity to resolve ourselves first.

To our benefit in a multi-path situation the effect would be doing some sort of diffing (decision based on what has changed) so the fact that a blind traversal oversubscribes is probably lessened. 

```js
createEffect(() => trackDeep(store), store => {
  doSomethingNested(store);
});
```
Then again if one was using a store to update an external data source I hope it wouldn't be directly referencing it since it would be unable to diff changes that way. And if it were to clone into its internals.. a `structureClone` upfront may not be that different.

### Potential Solution: Closure Effects

Another option that has been brought up a lot is the possibility of having split effects take this form:

```js
createEffect(() => {
  // tracked reads
  return () => {
    // the actual effect
  }
})
```

The benefit is you aren't creating the array and locally scoping variables. However, the closed over variables being create aren't saving you anything compared to the array. This doesn't matter for user effects but it does for renderEffect performance. There are few other mechanical considerations as well.

1. What if people don't return the function. Will they be tempted to just do their effects in the top-half? TS could help here to be fair.

2. How do you pass previous value if it returns a function? It's interesting because in Solid today our previous value is whatever we return. Whereas in the new split API its what we return from the front half, the last time the backhalf ran. One one hand, this accounts for the front running multiple times, like when async, or Suspended/Under Transition (even for a not direct dep). But we could return it from the nested function. However, that leads to...

3. How do we manage cleanups in non-tracked context? `onCleanup` hooks into the current ownership graph but split effects technically can have 2 cleanups, one for the left and one for the right, that are different lifecycles. This lead me to doing the React-style return the function approach to the back half with split effects, but if we are returning the value that is no good.

4. How do we manage errors? Putting a try catch in the nested effect function makes sense... but what if a source errors. Are you going to write `try/catch` there as well except that rethrows `NotReadyError`. There is a `catchError` helper for this I suppose but I don't know if this is intuitive:

```js
createEffect(() => {
  let value;
  const err = catchError(() => {
      value = something();
  })
  if (err) handleError(err);
  return () => {
    try {
      // do effect
    } catch(err) {

    }
  }
})
```

Whereas with split:
```js
createEffect(
  something,
  () => {
    try {
      // do effect
    } catch(err) {

    }
  },
  handleError
}
```

I should mention this approach still doesn't solve:
```js
createEffect(() => {
  // still need to track store here
  deepTrack(store);
  return () => doSomethingNested(store);
});
```
So this isn't particularly interesting I think.

## Events

Now luckily the fact that events are from the DOM (our render tree) means that in many cases for consistency sake we don't need to worry about their dependencies.

While it is really tempting with colorless async to pretend like nothing is async the reality of needing to show affordances and manage enablement of certain behavior is still very much real.

Often the thing that you attach the event to will be near where you are rendering the data that is needed. If you have an async counter the increment button will likely be close to it. You don't want to show that UI until it is usable so you will have Suspense guarding and that will be that. Once it's available then the value will be available in the event.

```js
function Counter(props) {
  const doubled = createAsync(() => doubleCount(props.count));

  // caught by the same Suspense boundary
  return <button onClick={() => doubled()>
    {doubled()}
  </button>
}
```

Even outside of Suspense you might still not want to let people say click buttons when async is in flight.

```js
function Counter(props) {
  const doubled = createAsync(() => doubleCount(props.count));

  return <>
    <button
      onClick={() => doubled()}
      disabled={isStale(doubled)}
    >
      Click
    </button>
    <Suspense fallback="Loading Count">
      {doubled()}
    </Suspense>
  </>
}
```
Simply the affordance required will lead people to building with the right patterns.

Now there is a point of debate here. `isStale` only checks for async after initial load. Should it have a mode to check for initial load as well.. Or should `isStale` throw to Suspense still initially. The latter would encourage Suspense boundaries would wrap these sort of checks. But it wouldn't be very helpful as guards inside the event itself where no one is catching. Of course we could just catch these errors since we attach the event handlers and can wrap them but there would be no visible affordance that these buttons are effectively disabled until the data they read is ready.

But to be fair it is worse than that. It's Effect tearing problem all over again. Someone might do part of an event before bailing:

```js
<div onClick={() => {
  console.log("Always");
  console.log("Maybe", possiblyAsync());
}} />
```

### Potential Solution: `suspendOn`

In the same way split Effects technically solve the problem but can be less ergonomic in some cases there are some mechanical forced solutions if above isn't sufficient.

The first approach is essentially a `suspendOn` hook. Think of it sort of like `useAction`. The idea is it registers an async dep and triggers Suspense above it:

```js
function Counter(props) {
  const doubled = createAsync(() => doubleCount(props.count));
  // this will now suspend above even
  // though it isn't read in JSX
  suspendOn(doubled);
  
  return <button onClick={() => doubled()}>
    Click
  </button>
}
```
The problem with this is it only works where the callback is defined. This has no idea of what to `suspendOn`:

```js
function Child(props) {
  // does `props.onSomething` read from async?
  return <div onClick={props.onSomething} />  
}
```
Which leads to these `suspendOn` to potentially go higher in the tree than desired. It might be fine since where you set the handler owns the state you which to converge with the change but it is a drawback.

### Potential Solution: `createCallback`

Yeah I'm not too happy about about this one either. But in theory you could force the dependencies where the callback is defined. And then essentially track it on read. This would require all event bindings to be reactive but it would work.

```js
// creates an accessor of an eventHandier
const onSomething = createCallback(possiblyAsync, (e) => {
fn(e, possiblyAsync)})

<Comp onSomething={onSomething()} />
```

Then if someone composed it they could do the same thing down the line since the handler itself would be tracking:

```js
function Comp(props) {
  const onSomething = createCallback(
    () => props.onSomething,
    e => {
      props.onSomething?.(e);
      // do my own thing
    }
  );
  return <Child onSomething={onSomething()} />
}
```
Of course while this removes the tearing/bailing problem it doesn't speak to affordances. This would just delay attaching the event handler. You'd still need to use other means to show loading/stale states.

## Closing Thoughts

I think the hardest part of looking at solutions here is that as much as things change they stay the same. Just because Async is colorless doesn't mean you don't need to make affordances for it. The wierdness can be summarized with:

```jsx
<button disabled={!asyncValue()}>Click</button>
```
This will Suspend as you expect, but if `asyncValue()` can never be null then why would you ever write that code. Yet writing defensively at the edge of the system is exactly what you want to be doing.

Inside the reactivity non-nullability and colorless async is a gift. It is transportable. It reduces concerns with narrowing. It even leads to less unnecessary waterfalls.

I can't blame TypeScript for this one even if we could achieve some perfect approach based on where things are read that defies the ability to type. Like say reactivity is nullable outside of tracking contexts. There was time I would have said that's the beauty of JavaScript that it can model anything, but JavaScript isn't what it used to be. Neither am I.