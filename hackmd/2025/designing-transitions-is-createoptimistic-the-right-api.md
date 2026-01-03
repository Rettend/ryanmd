---
# System prepended metadata

title: Designing Transitions - Is createOptimistic the right API?
lastmod: 2025-10-01
---

# Designing Transitions - Is `createOptimistic` the right API?

So I found myself very close to getting a basic Transition implementation in place and I realized I had a question that needed answering. What is the value of optimistic state on the Transition branch?

What I mean is, does it include or not include the optimistic updates. To illustrate I will pretend we we have a todo list we are adding a new todo to. I'm also going to pretend that we are doing it Strello style where it is a merged data set.

### Not Including Optimistic State

This was my first thought because why would we like have it show as pending in the offscreen branch that will never need it. To achieve this we would need to have the signal for these basically fork the original value and not update on change to the optimistic. It is more complicated but it seems doable.

But let's follow the time line. We start our transition and we write the optimistic todo to our list. This creates the necessary elements to show it. This isn't reflected on the transition branch which doesn't bother doing anything at this point and then when the data comes back and it reconciles it doesn't see the optimistic item so it just adds the new item. Then it removes the optimistic version right before inserting the updates on the screen.

This works but the optimistic and actual elements are created twice. Almost like they were in the non-strello version. It isn't our optimal fine-grained approach because the Transition can't diff the data.

I'm not sure if there are other implications to not having optimistic state in the Transition branch. It seems maybe more correct but it isn't optimal.

### Including Optimistic State in Transition

This is sort of the default behavior if I don't change anything. Basically hoist the setting of optimistic state outside of Transition so it lives in both without actually being part of the transition. In this approach order does matter a bit.

If you were to set the Optimistic data first before cloning the graph then when the graph clones it would have it, which means that elements would have been created and used on both sides. If you were to set the Optimistic data after cloning then each would end up creating their own copies of the elements. Because it would clone the `<For>` first and then run them as them indepedently.

But more so when the data came back the optimistic data would still be present so when it applied the changes it would have 2 copies of the new todo, which would lead to the elements being created an additional time. The only way to avoid this would be to defer recalculating the source side of `createOptimistic` until all transitions are about to be over so you know there is no need to apply the partial states again. This could be doable. But let's talk about this generally.

## What to Conclude so Far

1. Optimistic State needs to be visible from the Transition otherwise we can't do optimal granular diffing offscreen. 
2. Optimistic State needs to be applied before the graph is cloned. 

React doesn't care about this because their diffing happens at the end with the view that is generated so they don't need to diff until then.

But it is more than the diffing, we'd need to make sure that the Transition had access to the elements that come from the optimisitic state. Which is pretty much impossible unless we carry them through.. ie create them first. It isn't just diffing the data but ensuring we re-use any downstream nodes.

Which you can see is a bit awkward looking at this API:

```js
const [tab, setTab] = createSignal("a");
const [isPending, setPending] = createOptimistic(false);

transition(() => {
  setPending(true);
  setTab("b");
})
```

You are already running the Transition function at the time you add the optimistic update. We don't want to try to clone an in progress graph. We'd need to clone everything that is queued so we could run it first before we run our transition. Because otherwise we'd be cloning things in notified but not run yet states and those clones would never run.

So how I solved this so far was actually queue the Transition on a microtask so the queue is flushed, and then queued the pending state on a microtask on the main branch that runs after. So things update properly but the problem is the optimistic state runs after. Which means in our case each branch would create the elements. Not good.

## Wait a Second did Solid 1.0 have this problem?

No. You always had to set your pending state before the transition, because it wasn't part of the transition:

```js
const [isPending, setPending] = createSignal();

setPending(true);
await startTransition(() => setTab("b"));
setPending(false);
```
So it always flushed as part of the main thing and then the transition would be queued on the microtask. Ok.

So why am I so intent on including it? Well, entanglement and actions. The way Solid 1.0 worked we were banking on all the actions coming back being entangled in transactions after the fact.. it was more like:

```js
setOptimistic(newTodo);
await addTodo(newTodo); // action
await startTransition(() => todos.refresh()); // do the refetch
setOptimistic(null); // reset the optimistic data
```

Not exactly though because this clears after an await.. which is microtask queue. So having this cleaner is good because it require specific wiring which pretty much put it in the router. 

## So solutions?

Well if we assume we want to keep Actions as part of the Transitions.. ie.. have the async API. Then all we can really do is play with timing. Maybe instead of delaying the optimistic write, we delay the transition write. Although if someone tries to read the signal after writing it it wouldn't have the updated value.

Honestly this might be the best approach. I don't know how to guard against it though. Basically we can emulate Svelte 3 or React behavior here where either the signal but no downstream is updated, or the signal isn't updated. Just during the `transition` function. But it is unexpected.

But we need pending state to apply first. At the end it isn't as big of a deal because we control the diffing when the async comes in and if the multiple things impact the same optimistic update they will snag each other in the same diffing. In some cases we can't guarentee perfectly optimal but it should be very good in most normal cases.

## Alternative: We don't Include Optimistic

After I slept on this I realized that maybe the answer is putting optimistic updates completely outside of the Transition. That includes reconciling at the end. Maybe they don't show up in Transitions at all and even if optimistic is derived we don't see that change. Basically nothing downstream of optimistic state updates inside the Transition. 

You might be thinking about Strello and its board. That would mean while we could fetch the data at the end of our mutations we wouldn't be rendering the updated board offscreen. It wouldn't get rendered until it merged back in. Seems crazy but the only downside would be if this could cause waterfalls. But it shouldn't because we are rendering the optimistic branch, just on the main thread. In so we only do render optimistic once, always not in the transition. If it waterfall it would be the optimistic state triggering it not the transition.

I think this checks out. This way we don't need to mess with timing. And we can say that the inclusion of optimistic state in a Transition can entangle with others that innclude it. I think this is the solution.