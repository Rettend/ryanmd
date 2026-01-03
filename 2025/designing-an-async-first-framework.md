---
# System prepended metadata

title: Designing an Async First Framework
lastmod: 2025-10-23
---

# Designing an Async-First Framework

Every once in a while it is good to question our core assumptions and ask ourselves if we could start over what could we do. My recent work on async got me thinking about this. All current JS frameworks are sync first and build their consistency around that. But what would the ideal async framework look like?

## Characteristics

### 1. Every thing would be a Transition

Transitions would be implicit and not require an API. You'd opt out of async into tearing, like we do with `createOptimistic` but the default would always be on. This means no `clickAction`, `onClick` would just be a `transition` and even the backside of `createEffect`. 

### 2. You could determine pending state by asking

`isPending` wouldn't just apply to things downstream from the async portion of the change, but anything from the start of the change that hasn't settled. Set the next tab but can't see the change yet? `isPending` would return true for it.

### 2b. `latest` isn't a thing anymore, you need the opposite

Every value is the equivalent of the `latest` helper in this world so you actually might want the opposite. A way of showing the proposed value before it is finally applied. 

<b>EDIT:</b> Svelte is proposing an Eager helper to do this. Makes sense.

### 3. State changes would apply async

Yes the React behavior. Since derived values could take time to propagate and you wouldn't want to witness torn state it makes no sense to commit state immediately. More state changes could occur before the synchronous block ended that could cause async to entangle so you could never know at the time write that you can commit it right away unless optimistic.

### 3b. Push based algorithms like Milo's R3 look more attractive

Since there is no expectation for reads to trigger early stabilization since we aren't committing state changes right away, we don't need to notify early. Which means we could skip notification altogether and do a more performant algorithm. Also interesting is since R3 is eager, we actually don't need `createAsync`. The main reason for it is it forces things eager in a lazy system. In theory any `createMemo`/`createProjection` could just be async. I was hesitant about this in current designs because I've designed a pull-based SSR, but maybe push-based is possible.

### 4. New Algorights would need to be researched

Forking everything on all state changes feels like it would be expensive. iteration would be nice if this scenario could be known by tracing the graph. Another reason to hold off commits to collect the whole set of changes. We can trace downstream observers for async nodes to determine whether to fork. This may mean an additional pass. Also unclear if this method is fulproof. Async can be inherited from any source so a change of condition could reveal a different in flight async source.

### 5. Actions would need to be collected differently

No transition wrapper would mean wrapping each action. Still probably requires AsyncContext because if the interface is a promise even we restore with the wrapper, one more await/.then loses it. You could make it work decently well in many cases but not all.

## Doable Today?

Transitions/Actions only happen outside the system. A means to come back in. So making that global effectively extends the scope of the system. Is that too forceful?

Events, Effect callbacks are generally designed to be synchronous. Sure we don't need effects to return cleanup functions, but it is a thought.

The `transition` function is actually quite similar to MobX's `action` function. Generators existing for a similar reason to calling `transition` again. In the absence of AsyncContext it feels unlikely any solution could fully invest in this direction.

## Is it the Future?

The biggest question becomes is this an eventuality worth anticipating? Should it impact API design now? Delayed commits of `setSignal` would be incredibly disliked. Having a single `isPending` is pretty powerful and reduces API surface.

### Deferred `setSignal`

I can't picture anyone loving this change, but the one advantage of this approach is it obscures the reactivity algorithm from the developer. There is no `push/pull` vs `push` vs `pull` question, so technically you can change the approach at will based on what is most efficient. When you allow for immediate reads after writes there is no avoiding doing work. `push/pull` minimizes that work vs the others which can't know if what you are asking for needs to check for updates. But if you remove the question then it never gets asked. This is again an outside of the system concern. Inside tracked scope you shouldn't be writing to Signals so it's always consistent.

So in general immediate propagation of state changes is a convenience for a cost. Deferring it is theoretically always a "correct" solution. But we all know "correct" doesn't mean best.

### `isPending`

The proposed underlying not ready or in transition isn't only nice because it removes the need for `useTransition` it highlights that asking pending need not be considered via optimistic state. In fact it is considerably different. Optimistic straddles both realities converging on a future. Pending is ephemeral and only needs exist in the visual branch.

What is nice about single mechanism from a composition standpoint is you can write your affordances one way. Like sometimes a component isn't the source of a transition but has it's own loading state transition or not. Suspense isn't built for this case which is more for large initial load scenarios. 

A drop down probably should show loading/disabled when it's options are pending as any selection here would be lost. `isPending` would still trigger a parent Suspense initially but now the update case works regardless of if the change was in a transition or not.

There is a loss of connection of cause/effect but the question of what is pending is descriptive. `isRouting` is asking if the router location `isPending` rather than using a pending state provided with the routing `transition`. So it is possible to get false positives if the graph is related. I don't know if those are actually falso positives, but if you have a list of `Todos` and you ask if a specific todo is pending it would be possible that if we knew the action was refreshing the list then it would be.

Is that a bad thing? Not sure. In an implicit Transition world it would just be the case. In any case this one is definitely worth exploring.

## Conclusion

As with any sort of new shift in thinking we have to be careful not to go too far down the rabbit hole at first or we distract ourselves and we don't know the full implications of these decisions. However I love seeing sort of parallels between developments happening in different areas that would aid here.

I think the bottom line is until AsyncContext this is probably dead in the water. But definitely something we should be keeping in mind if this would ever change.