---
# System prepended metadata

title: Different Take on Async/Concurrency?
lastmod: 2025-11-06
---

# Different Take on Async/Concurrency?

It seems pretty clear looking at React and Svelte that there is a race going on to finding the perfect Async first model. It is difficult to migrate from Sync-first to Async-first, and React's solution looks like it will take years. Where Svelte appears to be hitting the ground running. Less unnecessary wrappers and unified execution model is really quite impressive.

Of course Svelte accomplishes this in part due to its compiler. I have no interest in being compiler dependent. So the question is if this is the direction anyway is there a way to accomplish something in this vein that is purely runtime?

Let's consider how we recreate Transitions without them.

## 1. Defer "pure" cleanup

What if all cleanup was deferred until side effects run? What I mean is `onCleanup` to queue on effectful run (like maybe same timing as render effects) rather than run immediately before re-execution.

Keep in mind these things should be side effect free. So in theory when they get released shouldn't matter. This isn't true for some cases like scheduling async cancellation, but since we have a `createAsync` primitive that mechanism could be built internally. Basically `onCleanup` runs when something is released but it is possible to have multiple things exist at the same time.

The benefit is that async could effectively branch without disposal until committed. Rerunning a conditional wouldn't destroy the visible branch until it actually unmounted. Instead of forking it would just be blocked from update since the effect would be locked up. However descendants could continue to be live even if they were to unmount.

## 2. Hold Async Values in the Past

While we wouldn't necessarily need to hold off applying values on execution effects that depend on nodes that were marked as Not Ready including those upstream would not run the back half until ready. This could be accomplished by throwing on read of these when specifically under the pure part of Effects. 

Challenges here around effect grouping apply though. The reason we use `latest` on effects is to make grouping not matter and to use `latest` here we would need to actually not apply the value. That being said graph shape could change here without forking, we'd just need a pending value. Not unlike what we did with `batch` pre Solid 1.5.

Mechanically marking Upstream is also a new challenge. It makes sense to do this at notification time, and if you notified an async node mark it on the recursion back up. However, that is too late for the things you already notified.

Svelte's approach here is actually pretty straight forward. They don't mark upstream they just hold everything that comes in on the same flush if they hit anything async during it. This doesn't stop other things from running the effects and seeing the updated values on things upstream.

So what if we designed a system like the following:
1. Outside of owned scopes always see the last committed value (unless otherwise indicated `eager`)
2. Inside owned scopes we always see the pending value if available unless otherwise indicated (like `latest`). Render effects will use `latest` so they will require `eager` to break out of that.
3. When we would write we instead write to a pending value and set the clock time, this can be overridden
4. We commit the change of value after pure execution on any cycle that doesn't hit async if the time matches, otherwise we store the effects and the time of this flush
5. Upon async resolution we deplete the queue and run the cached queue. We first set all the values then proceed to run side effects.

What this should accomplish is that the graph generally runs in the future, but render effects will show the past if they run out of sequence.

Consider:
https://svelte.dev/playground/0a3bbcf95eda413a9aeb13aebb493726?version=5.42.1

The differences we want to observe in the UI:

1. Hitting "Together" or "Async" repeatedly should only show the final value. `createAsync` does cancellation so that should work.
2. Hitting "Async" then "Non-Async" should behave the same.. We should see the locked up async derived value but the other value should be able to update.
3. Hitting "Together" then "Non-Async" should be similar but writes should go against the non-pending previous value so it shouldn't jump over the number "Together" would have set.
4. Hitting "Together" then "Async" should also hit cancellation so we shouldn't see an intermediate value with the updated sync state.

It is important to recognize this is the visual representation. Under the hood the graph will always see the pending values and throw on Not Ready ones.

## 3. Optimistic State and Actions

Optimistic State is basically a way of setting pending state that is eagerly applied. The `reset` has to happen as values are committed but works pretty similarly. In a sense `reset` could be the pending value. But we actually always want to see the committed value internally as well. And we probably need to reactively trigger the write at the end so leveraging the same mechanism might not work or require additional flags.

But what stops this just flushing right away? Optimistic state at minimum needs to live the life of the async propagation but in the case of "actions"/"mutations" there is nothing tying the graph.

Like:
```js
async function addTodo(todo) {
  setOptimisticTodos(t => t.push(todo));
  await db.addTodo(todo);
  todos.refresh();
}
```
If we are like let's add an action helper. Well that isn't that different than `transition` and all the composition concerns come back:


```js
async function addTodo(todo) {
  action(async (resume) => { 
    setOptimisticTodos(t => t.push(todo));
    await db.addTodo(todo);
    resume(() => todos.refresh());
  });
}
```

Does `resume` even work here? Yes. It depends on the implementation. But it could tie the optimistic update to the completion of the specific work being done.

Alternatively though what if "optimistic" wasn't a concept:

```js
async function addTodo(todo) {
  setOptimisticTodos(t => t.push(todo));
  await db.addTodo(todo);
  todos.refresh();
  onSettled(() => setOptimisticTodos([]))
}
```
The "optimistic" update would apply immediately because it is sync. And then `todos.refresh` would essentially start a transition. And then `onSettled` we would reset the optimistic list.

The problem here is if you click the button to addTodos at the right cadence you could have 2 updates in flight and they not realize they collide. If you click the second right before the first finishes refreshing, it will still be awaiting the save action at the point the first finishes and then it will clear out the optimistic causing your optimistic state to disappear.

You could mark the `db.addTodo` as an action and then it could entangle actions of the same type. This is what Solid 1.0 does. But it is a little tricky here because `onSettled` then needs to be of the same context as the action so it is aware of when to fire. So we need an action API:

```js
action(async () => {
  setOptimisticTodos(t => t.push(todo));
  await db.addTodo(todo);
}, (settled) => {
  todos.refresh();
  settled(() => setOptimisticTodos([]))
})
```
Is this any better than the other `action` API? The other one can keep on chaining and this one cannot. Or I suppose it could taking a variable number of functions like `action().action().complete()`. Like chaining promises.

The problem with this is it doesn't really compose well from child starting the action. Now arguably with this setup the child doesn't need to. You don't need design components to bake in Transitions if everything basically is one. The choice to make something an action is on the consumer if this can be done right.

I suppose we should consider Server Actions and Progressive Enhancement here to if we are going to re-evaluate this on actions specifically. Server action at it's base is:

```js
const myAction = action(async (todo) => {
  "use server";
})
```
And it needs to be direct like this because we can't rely on client side javascript to wire it up for progressive enhancement. This means that optimistic state needs to be an enhancement. Ie. a different scope. It could be decorated locally like we do with `with` since it probably requires updating local state.

```js
function MyComp() {
  myAction.optimistic((todo) => {
    setOptimisticTodos(t => t.push(todo));
  })
}
```
Now Server actions do the "refresh" behind the scenes which makes the reset of optimistic also behind the scenes really appealing. Because above is all you would need.

It also makes the case where the refresh is in the open fairly straightforward:
```js
myAction.done(() => {
  data.refresh();
})
```
Unfortunately we can't just use `.then`. I mean we could but it wouldn't work on `async/await` only explicit `.then` calls. Important `.done` is called when an individual action completes which isn't necessarily when `optimistic` resets. Of course this requires optimistic as a concept still unless we want to introduce another "done" like timing.. Like "optimisticEnd"..


There are still a lot of details here though. Like optimistic entanglement. I think atleast there are options on the API shape but it does take recognizing "Actions" as a thing. Which isn't so different than what we've been doing in SolidStart/Router. It's just the naked await doesn't entangle. This isn't as generic. Given that I concluded that `optimistic` probably still wants to be a concept. This might still just want to be the API:

```js
async function addTodo(todo) {
  action(async (resume) => { 
    setOptimisticTodos(t => t.push(todo));
    await db.addTodo(todo);
    resume(() => todos.refresh());
  });
}
```
Or generator version like MobX. Maybe if restricted to action and no intention of burrying this in the design system that's ok.

```js
async function addTodo(todo) {
  action(function*() { 
    setOptimisticTodos(t => t.push(todo));
    yield db.addTodo(todo);
    todos.refresh();
  });
}
```
Because you don't need to bury this in the design system. Simple state sets will behave without any of this. This is really just for mutations which means you are always yielding. Progressive Enhancement could still be an addon for server form Actions:

```js
// special action wrapper from the router
const myAction = mutation(async (formData) => {
  "use server";
  await db.addTodo(parseFormData(formData));
});

function MyComp() {
  const [optimisticTodos, setOptimisticTodos] = createOptimistic([]);
  
  return <form
    action={myAction.start(formData => setOptimisticTodos(t => t.push(todo)))}
  >...</form>
}
```

## Conclusion

This is possibly viable. What makes it interesting is that simple cases don't need `transitions`. The only special treatment happens in actions and if people follow like framework best practices like SolidStart's conventions around `query/action` or I guess this would be `query/mutation` (to leave space for `action` in core) they wouldn't hit this stuff right away really. They wouldn't be thinking about optimistic state outside of that context and with exception of a couple calls to `eager` here and there to cause tearing and mostly well placed `isPending` things would just behave as normal.

Well the new norm. The biggest thing this is suggesting is that we delay committing the graph on the outside of the system. This really wants React semantics around state setters. Like really really wants it. At this point it makes complete sense to adopt Milo's more performant R3.

Which I guess leads me to where I need to go next. Ask Milo what he thinks.