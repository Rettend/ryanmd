---
# System prepended metadata

title: Hierarchical Reactive Scheduling Boundaries
lastmod: 2025-07-23
---

# Hierarchical Reactive Scheduling Boundaries

One of my goals in 2.0 is to find a pattern for sectioning off parts of the ownership graph to live as their own effectful reality. That is I want to generalize things like Suspense, Offscreen. But figuring out how to exactly slice it might take some thinking.

The approach I'm proposing is to split the ownership graphs scheduling by hierarchically injecting a scheduler via Context. It is a bit trickier than that as the root scheduler may still need to coordinate children. So it is more like by default they play along when parent is triggered but you can override that behavior for yourself and descendants.

Roughly I think usage of this capability falls into 2 categories.

### A. Conditional Execution

These are situations where things can run as normal but certain conditions lead to disabling running certain computations.

For example Suspense doesn't run the effectful part when it detects unresolved async within its bounds. But when it all resolves it runs as normal.

Offscreen shuts off all execution when detached (or out of the view window) but runs as normal when it is.

### B. Manual Schedule

It's possible there is no connection between normal updates and when it does. Picture an area that schedules on `requestIdleCallback` as to only do updates as browser is available. Or something that polls every 5 seconds.

## Scheduling

First, we have multiple stages in running reactivity that should be respected. So even if we were to treat parts of the graph independent we probably still want all their lifecycles to happen lock and step. Part of the reason is that we can nest things and part because signals can be higher up in the tree and be read anywhere.

So on a given reactive run there are 5 phases I think:

1. Pure(Scheduled) Computations
2. Pure Render Effects
3. Pure User Effects
4. Effectful Render Effects
5. Effectful User Effects

Now I suspect that the order of 2/3 do not matter and they could be merged. Being pure they shouldn't impact each other and being effects they are at the end of the chain. It is also possible that maybe 1 can also be merged as well since it is pure. However, it is possible that given we do not have a completely "correct" way of handling projections right now we should rely on pushing things like that and async to the front of the pure line always. Since these are pure things that write it makes the list more stable. But maybe that is a distinction for later.

And also there is also the consideration that as these are running more things can be added since you can create new Effects and Computations inside the pure part. So the list should stay present until the end so we can append more.

Now the effectful part should run in order so that user effects can read from a completed DOM. If they did not need to we wouldn't even need renderEffects. So let's say there are 3 phases:

1. All Pure Stuff
2. Effectful Render
3. Effectful User

And each of these can be subdivided into queues that are responsible for a hierarchical section of the ownership graph. So for this to work I think we'd need to have parent try to call the child as it runs each of its phases. This suggests each Queue could take on an interface like:

```ts!
export interface IQueue {
  enqueue<T extends Computation | Effect>(type: number, node: T): void;
  run(type: number): void;
  flush(): void;
  addChild(child: IQueue): void;
  removeChild(child: IQueue): void;
}
```
The expectation is that you'd only call `flush` on the top most and it would know how to `run` each type/phase and run the children registered with it on that phase.

Now the children themselves could choose to early return on their `run` function which means that they are choosing not to particupate. For example `Suspense` that noticed some async could not run their effectful part of the effects until the time of their choosing by shortcuting `run` in that condition. Offscreen could just do nothing in `run` when the mode is set. And part of the UI that never wants to be part of the global queue could just implement an empty run function.

We can inject this similar to context by setting a `IQueue` or using global and then effects in their constructors would be associated with the parents.

## Consequences

We need to think about what this control does for consistency. Because Signals can update and not reflect in the UI. I think it is expected with this and those using these APIs. Things like Suspense would show fallbacks, otherplaces just wouldn't show updates as often and it would be up to the implementor to come up with affordances.

Another consideration is `flushSync` really can only apply to the globalQueue. Yes any queue you have a reference to could be flushed manually but if end users call `flushSync` they might not get the results they expect. Again I think this is pretty edge case because these queues are managing side effects so while say an event handler might not see the result of an effect that hasn't run. No one has. `flushSync` has very little meaning with async and all of these scenarios seem to be intentional opting into some sort of asynchronicity.

## Other Thoughts

Are there that many examples of this sort of mechanism in the wild. I think Suspense would need to be implemented core anyway because we need to have the effects that `async` out to be able to trigger the mode switch. Suspense probably needs its own context provider anyway because you could say nest an OffScreen in a Suspense so the nearest queue isn't the Suspending one but it still needs to look up and find the nearest Suspense.

This sort of scenario should still work regardless because an Offscreen that isn't on the screen won't read the async under it which means it won't suspend, and at the point it does then it should bubble up to the Suspense boundary. Similarly an Suspense in an OffScreen is basically as if it didn't exist. So these layer well.

The last bit of complication comes to Transactions. In the past we had a single queue we hijacked synchronously. Now we might need to clone the queues. For things that flush manually it is an interesting complication. Transactions are all about tracing from the change to through the impact but if you aren't in control of that impact anyway?

Generally the process is update a pending value on signals, clone computations as you notify, clone effects (I guess because they need to run the pure half), push impacted ones to their respective queues and run them top down. But if phases aren't going to be cleared in some cases the queues themselves are stateful so they need to be cloned as well. Or atleast instantiated fresh before anything is pushed to them. Which is pretty hard to predict until you do the pushing. So they too are cloned on notification I guess. Which means we aren't really discriminate on inclusion? 

I suppose that just means something will be cloned and queued and never run. As the Transaction ends it will run the effectful phases only on everything. At which point the cloned queues can be thrown away, so any that don't run just won't run. No that isnt quite right be cause they will need to know that scheduled things have been dirty and they need to recalculate.

I think all we can do is have queues decide not to be part of Transition and basically store the things what would be enqueued instead of cloning. Basically if Offscreen is Offscreen at the time then it is saying hey I'm not participating and we'd just collect the stuff to be queued and enqueue them at completion.

It almost makes me wonder if there are potentially known states here. Maybe I'm worrying about this too much for an API that is mostly internal for people writing frameworks on top of our reactivity. Maybe it is opposite. Maybe queues don't participate in Transactions by default unless we make them so. And the ones that ship with the library all support Transactions. I imagine most of the custom cases are fine not.