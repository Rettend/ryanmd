---
# System prepended metadata

title: Designing Transition - Mechanics
lastmod: 2025-08-25
---

# Designing Transition - Mechanics

Ok I'm going to attempt to write out the algorithm atleast the plan for it to make sure it is sound. Well sound enough.

This will be pretty much thoughts off the top of my head so my perspective might adjust as I go on. Hopefully that doesn't make it too hard to follow.

## Summary

1. Start Transition sets Transition to be created on the next microtask.
2. Create global reference, including Transition Queue, and run provided function
3. Upon write clone signals and all downstream dependencies (maybe during notification).
4. Queue all of these to the Transition Queue (which acts as a substitute for the Global Queue)
5. Collect promise if transition function is async
6. Run pure queue of the Transition Queue, any newly created nodes are not part of the Transition, and can be queued into new child queues as needed.
7. Collect promises from read async
8. If promises have not all resolved by this point do not run effectful side of effects
9. When promises resolve restore Transition at each point start from #3 again
10. When all promises have resolved and we are at the end of the pure queue, merge back cloned nodes, and run effects

## Details

There a lot more details in each step so some notes.

### 1. Start Transition sets Transition to be created on the next microtask.

We do this to finish current execution and drain the current queue before starting. Even chained queues should run synchronously after you are running the queue so except for additional Transitions this should fire at the right time.

### 2. Create global reference, including Transition Queue, and run provided function

We will need both an ActiveTransition global and list of all current Transitions. The reference will need to include a TransitionQueue. There is some questions to whether it should also clone child queues. While Suspense runs once and we don't really want to interact with the queue in Transition it might be worth cloning queues so that new child queues end up under the right parent.

### 3. Upon write clone signals and all downstream dependencies

#### Cloning

Let's talk about cloning. We want to clone them back to basically initial state. We don't clone cleanup, or children. We need to backlink dependencies and observers though since it is possible for the main thread to cause an update that triggers these. So any new clone is going to clone it's observers, but it also needs to add any clone of those observers as well.

Dependendencies are more interesting. Because once it re-runs the old deps would be released so it isn't as simple as cloning. Like if you had cloned deps and either the Transition or main thread version ran that version wouldn't have the deps of the other. So in a sense they need to stay linked. We want to clone the state and value, and have different cleanup/ownership and we want to maintain our own observer/deps arrays but we want to register the original nodes in the graph.

![Transition](https://hackmd.io/_uploads/H1hrZq9Oge.png)

#### Merging on Clone

The other consideration here is if a write would cause Transitions to become entangled.. Ie become the same Transition instead of distinct ones. If you were to write to any of the same sources it definitely would. But what if it is isolated Signals that happen to be read by the same computations?

Well if we were not to merge them up front we'd need to handle merging them later which seems messier. So we probably want to merge once we hit any node that has a clone in a different Transition. However, does that make multiple realities too unlikely? Maybe. But keep in mind cloning only applies to the existing nodes and not their children. So you could have a Transition say managing page navigation and a different Transition doing something on the current page at the same time without them conflicting.

I guess the take away is there can only be one clone per node. This might be pretty freeing from an implementation standpoint because we don't need arrays just a pointer.

A similar question is what if something causes a node to be disposed permanently on the main thread? Like a parent re-evaluates. There is no node left to merge it into so the clone effectively would be disposed as well. This also might be a scenario where a Transition ends up being effectively cancelled.

Still the approach we are taking has no explicit cancellation, only merging. You can only move forward not backwards. This is the way the reactive system typically operates and should continue to. In the case of these psuedo cancellations the Transition might linger longer than it needs to but it will essentially die on the final merge.

### 4. Queue all of these to the Transition Queue

This means that at the locations we notify we need to change the queue from the default queue to this. Should be a simple `ActiveTransition` check.

### 5. Collect promise if transition function is async

In the last writeup I talked about the API shape for Transitions:

```js
transition(async () => {
  setPending(true);
  await saveTodoToDB(newTodo);
});
```
In this way we can capture promises for actions as well as for reads.

But if we want subsequent state updates to happen inside the Transition after the await we need short of having AsyncContext the ability to resume a Transition:

```js
transition(async (resume) => {
  setPending(true);
  await saveTodoToDB(newTodo);
  resume(() => setDifferentPending(true));
  await somethingElse();
});
```
We don't have to worry about the chained awaits because the transition will wait on the promise it gets back which includes both.

There was some thought whether the resume function should have its own resume etc.. but I think we should make it that if you call resume on an already completed Transition it errors. Technically it shouldn't be possible within a synchronous execution (ie.. resume runs before the outer context Promise resolves), but just in case people do weird stuff.

### 6. Run pure queue of the Transition Queue, any newly created nodes are not part of the Transition, and can be queued into new child queues as needed.

This part seems a bit complicated to figure out exactly how to manage the new queues. That being said the same override as before when we queued should be in place. The choice of queue is based on the Active Transition and not whether it is owned inside the Transition.

### 7. Collect promises from read async

This actually might be a bit difficult the way we are setup. In the past we directly connected resources to where they were used/suspended. Now we propagate through the graph. That propagation basically needs to refer to the cause if we are to collect stuff. I guess we can collect not ready effects nodes the same way we do with Suspense. Since we know they will run again when they are ready. So I guess it isn't promises as much as Not Ready Effects nodes.

### 8. If promises have not all resolved by this point do not run effectful side of effects

This atleast should be a simple check. Then we set the current Transition as not active and wrap up.

### 9. When promises resolve restore Transition at each point start from #3 again

This is interesting since we are only collecting initial promises from the Transition/resume.. so those cases need to handle their checks, as well as we need to drain the anything scheduled in the Transition. So it is a bit 2 pronged. Either the `resume` reinjects the Transition context or running the Transition queue does.

### 10. When all promises have resolved and we are at the end of the pure queue, merge back cloned nodes, and run effects

This atleast might be more straight forward when we get to this point. Existing nodes that will be merged will need to be cleaned up. I think it might be worth actually marking on the forked nodes if they ever ran. We might overnotify.. ie over clone but not run everything. In that situation we don't actually need to get rid of existing nodes. But otherwise depending on how we link stuff hopefully it is pretty clean surgical cut in.

## Takeaways

1. We only need to clone nodes are notified during Transition. Since we discourage writes in computations, this should mainly be in `transition` method or `resume` or in firewalls while draining the pure queue. Everything else can be created as normal.

2. When cloning we don't need to clone children or cleanups. These will be created when it runs and we don't want to cleanup the original. 

3. Since this is a variation still on single future (even if there can be discreet parts) we only need one Transition specific node(cloned) for any existing node.

4. We have to be conscious of keeping independent graphs while still being able to notify from the main branch to the Transition branch. This might take a little bit of fiddling with in terms of how we do the linking and the lookup.