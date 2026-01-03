---
# System prepended metadata

title: Future Reactivity Design
lastmod: 2023-04-24
---

# Future Reactivity Design

I want to focus on 2 key mechanisms that I believe central to moving to lazy reactivity. This document will layout ideas on how they could work.

## Root-Scoped Effect Queues

One of the biggest benefits of lazy pull based reactivity is that we can defer work until we need it. Whether the next Microtask or some arbitrary time later. The concept here is that we should be able to control when certain subtrees do their work.

In contrast to the second proposed mechanism below this one doesn't care about async only about controlling when work is flushed.

### Idea 1: Merging with Existing Roots

In order for this to work there needs to be a way for each root that opts in to manage its own queue and register with its parent root so as a flush from the parent can possibly flush the child.

This requires each root to have its own flush function keyed to it. We can't use the context of the call because it can be called at any scope, and the child root to have the ability to control whether to flush with its parent dynamically.

For performance not every root should have its own queue.  Only those that opt in to having a `shouldFlushWithParent` helper perhaps. Like a For loop with 1000 rows doesn't need 1000 queues. Arguments passed in to dispose or flush area bit awkward. Maybe an object?

Does it make more sense as:

```jsx
const res = createRoot(root => {
  root.dispose();
  root.flush();
  return stuff;
}, {
  shouldFlushWithParent() {
    return false
  }
})
```
Realistically this might need 3 values... Because it needs to decide whether to flush renderEffects as well.

Scheduler Idea:
```jsx
const res = createRoot(dispose => {
  return stuff;
}, {
  scheduler(runEffect) {
    queue(effect) {},
    onParentFlush() {}
  }
})
```

## Async Transactions

Idea behind this is starting from the root of a change no changes are applied until all pure calculations are resolved.

The challenge here in a pull based system is the work starts at the effects. And we don't know every dependency as they could be dynamic, until we run them. For normal propagation it is enough to know one things has changed to run the effect, but here we need to know exactly what it will depend on.

This means separation:
```jsx
createRenderEffect(
  (prev) => // stuff we track return value to pass to 2nd fn
  (value, prev) => // non-tracked do the work
)
```
The first function can run as many times as we'd like as long as we run the second function at the right time.

In other libraries like MobX this sort of primitive is known as a `Reaction`. It isn't lost on me this follows a similar form to `createResource`, but it is different in that the second function is not meant to return a value.

Important detail is the front half could run multiple times before the back half runs which means that for diffing it does need to keep track of the last passed in value.

Unless we take the stance that Effects should just use closures. As they don't need to worry about concurrency.That aside these need to always schedule the first half (and it could be microtask) even if root says not to flush. And these need to run before other effects.

2 scenarios I see.

### 1. Normal Execution

Render Effects run both sides immediately without queuing. On update they are queued and run both sides ahead of other Effects.

### 2. Under Suspense/Transition

If flushing returns false, we still run the renderEffect queue we just only run the front half and we don't clear it. When Suspense is cleared we re-run the queue and then run other effects.

We may need 2 passes as we don't know Suspense is cleared until we run all the pure half.

## Async Primitive

What if we wanted to natively handle it with promises. Ie.. any memo would unwrap promises and if it did it propagated it's asynchronocity through the graph.

```jsx
const v = createMemo(async () =>
  (await fetchUser(source())).json()
)
```

The first consideration is a `memo` is lazy and these need to be eager otherwise you introduce the diamond problem again. You don't want to fetch on read. This suggests another queue. It could be the same as the renderEffect queue, but everyone of these needs to be run.

### 1. API

API-wise this could be:
```js
const v = createMemo(fetchUser, undefined, { eager: true })

// suggesting a generic API for eager derived values
// possible migration path
const v = createComputed(fetchUser)

// make it a thing, although it might not need to be
const v = createResource(source, fetchUser)
```

#### Option: Async Components

What is cool about this approach is that we are sort of bottling up async and if we handle propagation properly(see below) the end user would never need to be aware of the propagation since they would not need to null check. We could then rely on static analysis of `async/await`. Since `async/await` colors we can be assured that our component will have the `await` in it even when composing.

Consider

```jsx
async function MyComponent(props) {
  const user = await fetchUser(props.userId);
  const details = await fetchUserDetails(props.userId);

  return (
    <section>
      <h1>{user.name}</h1>
      <Suspense fallback="Loading Details...">
        <For each={details.hobbies}>{() => ...}</For>
      </Suspense>
    </section>
  )
}
```

We could just wrap each await statement with a compiler with our `async memo` so instead of being a blocking waterfall each of `user` and `details` are some sort of signal. It's better than `Promise.all` and it's better than waterfalls. Notice how the `Suspense` boundary is below the fetch.

This is a bit like destructuring at first look as a way to hide things, but it has none of the inconsistencies because you have to await in the component. Which makes it atleast a little more compelling.


### 2. Propagation

Anything that would read from an async memo would become marked itself. We'd need to mark the internal node. And then when read from the pure side of a render effect we know to Suspend/Transition.

The easiest way to accomplish this flag is to mark any memo that is halted and then produces a promise. It will return the previous value but on read mark it's reader and set its flag not to dirty as to not run again. On resolution it will need to queue a change with new value and halted flag removed. Any computation that re-runs clears the halted flag on re-run.

#### Option: Fine-Grained Blocking

What if reading a Memo when it is halted throws a promise after subscribing. And we knew not to run impure things that depend on it.

Consider:
```jsx
const user = createMemo(() => fetchUser(props.id))
const fullName = createMemo(() => `${user().firstName} ${user().lastName}`)
const capitalFullName = createMemo(() => fullName().toUpperCase());
```

When we go to read `capitalFullName` it pulls through to `fullName` which pulls `user` at which point it subscribes, throws and marks `fullName` as halted, which then subscribes, throws and marks `capitalFullName` as halted.

When this read by a render Effect it also throws and and marks and knows not to render the effectful part. It is important that the source memo doesn't throw mind you as we don't want this propagation to go back up to Suspense. We will still use context for that.

We need to propagate the promise down to the render effect as it is that which must lookup for the Suspense boundary. What if there is none. Can this process be generalized.

What if roots had a `onHalted` event? Then they could handle it as they see fit. The idea is that during normal propagation if any renderEffect is halted, we determine the whole queue is halted. We will run any non-halted renderEffects but general effects cannot be run yet. 

Only downside of this approach is it makes no consistency guarentees. It's like Suspense if there was no fallback. So while it won't commit anything that would cause tearing the reading of state would be incorrect as the values would be updated.

Ex. Consider a carousel with a like button. Upon clicking next we could hold applying the change until until the next item is loaded, but clicking like would unfortunately try to like the next item while showing the current.

This might point to keeping values in the past. But without async transactions we can't have both realities. A simple hold in the past won't help us once we go async. Sync works because it sets all the values before running computations and knows it will be consistent at the end. We cannot do that.

### 3. Skipping double fetch on SSR/Hydration

If we could lineup on ID it'd be easier, or identify async functions. Then we could tell the runtime to assign one without running it.

This is probably the hardest thing to solve because the Memo would need not to execute when the client starts up which to date required the server to indicate it. Without knowing a Resource is a resource is tough. We could try to serialize every Memo unless indicated but that'd be excessive maybe?

This all points to serialization solutions. The one benefit of serialization solutions is in theory it might not be the source async memo we want to serialize but the downstream derived value. Ie.. it isn't the resource but something downstream. So this could further reduce computational cost at hydration time.

Other challenge is hydration cache fulfillment. Like there could be an effect that did it. Maybe that is sufficient as we'd handle any deduping before it ran.

### 4. No concept of loading/errors

Loading is Handled By Suspense but we need better Error primitive. Answer is simple. Feed it in as a Signal:

```jsx
<ErrorBoundary>{
  (err, reset) => {
    // now the choice of unmounting is up to you
    return <Show when={!err()}>{
    }</Show>
  }
}</ErrorBoundary>
```

### 5. Deferring Stream Flush

Without the option we need a new plan. I think the easiest would be that any top level async read is waited for and you can break out of it by wrapping in Suspense. Then we could have Suspense be the one that decides whether to wait or not. I think this will be sufficient for most cases.

### 6. Making it a Store.

We might just have to bite the bullet and assume it is always a store? I don't know this is probably the most interesting question here. Because it isn't just a Store, but one that auto-reconciles and you can't do that without configuration or a really good default. So this needs more thought.





