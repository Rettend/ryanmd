---
# System prepended metadata

title: Designing Transitions - Topics
lastmod: 2025-08-25
---

# Designing Transitions - Topics

## Single Future

I've been a big supporter of this approach since the beginning because it is really the most straightforward way of handling a multi-node graph. Even before React went this direction I did it in Solid so I could get the feature out.

Since then there has been this thinking that it would be great to have multi-future. React wants to get it one day, and I started proposing what it would look like in Solid. However, I realize that my proposed approach in Solid wasn't truly multi-future.

Even if you can have multiple independent Transitions going it only becomes multi-future if a single node can exist in multiple states. The complexity of this is if they are seperate states they need to merge and that only leaves a couple options.

1. Merge at the end. This can be tricky because it can cause re-calculations. Like what if both transitions have different sources that trigger the same async. Each one will see a different value for the other. So first will fetch, second will fetch and see the original first value, then whatever one finishes first will cause the other to fetch(now a 3rd time).

2. Enforce order. This basically means that we assume the Transitions sit on top of each other. So we merge ahead of time. However, we need to hold final merge until the Transitions ahead of it clear.

So I'd say probably #2 is the best multi-future approach, but it precludes cancellation as well. Basically it's the same as Single-Future except it can ease thing out in pieces. At which point most people aren't going to be able to tell the difference between this and Single-Future unless they starve the Transition. Ie.. just keep on updating and never letting it settle. But it's hard to know when we should be letting things in to render.

## Merging Actions/Transitions

Transitions, Suspense, etc all work off the fact that the graph is traceable. We know once we trigger something all the potential work downstream. We notify it. When you update some state.. or trigger a computation we always know the breadth of the potential impact. We might over notify a bit but when speaking about Transitions isn't a huge deal. Like in those cases we make a single Transition. It's probably OK. And maybe even something we can optimize.

But what is the downstream impact of:
```js
transition(async (resume) => {
  const updatedUser = await saveUser(modifiedUser);
  resume(() => setUser(updatedUser));
})
```
What I mean is we don't know we are calling set until after we get the response from save. It doesn't really matter what the aftermath is.. Even if it is a cache referesh etc.. we don't know until after.

I admit I think I realized this in Solid Router and didn't include mutations as part of the Transition only everything that came after. But I also needed to come up with a whole different optimistic take. And more so there is a timing concern.

```js
// current Solid approach basically:
setOptimistic(modifiedUser);
const updatedUser = await addUser(modifiedUser);
transition(() => {
  setOptimistic(null);
  setUser(updatedUser);
});

```

There is a gap between when the mutation is committed on the server and when the Transition starts since it has to communicate back that the mutation succeeded. Since there is nothing downstream async in this example basically these will all be seperate Transitions and while we clear each optimistic state seperately perhaps, we might get results from the server that already include multiple updates like before fetching updated results multiple have saved. Which means things might appear twice both in the final results and in the optimistic results that haven't cleared..Or things might disappear before reappearing.

We do have one benefit in the current system in that we always refresh instead of send back the data.. even in singleflight we are sending a promise. So it is more likely that they get tied into the same Transition as they complete. But there are no guarentees. Again this only happens when you are really jamming it and when the server/database is busy enough to processs things out of order. But there is a small window possible.

The benefit of starting the Transition upfront is that we know there is a Transition going on. They will all be captured and handled appropriately. Except what do Actions impact? Everything? Anything? Could we even be able to tell from the client code? Well as much as we can tell from a firewall I suppose. Basically we don't know until the write, what for sure will be updated. But like picture single-flight mutation with variable invalidation. The server decides what gets invalidated and sends that back to us. It literally could be anything?

We could build APIs to hint at what we might update with the action but is that really the way we want to be going? What else can we do?

Let's pretend we don't merge. And wait until the action comes back to see where it collides? Does this get us in trouble? Well if something else fetches the thing that the action impacts. We might get the update sooner on the main branch. But that would happen regardless of Transitions. We can't control when the database writes and if you read independently of the change, yeah it can happen. 

But mostly the problem is the same as above if we have multiple Actions(promises from the Transition function) going out. If we don't treat them as the same Transition then there is that gap where one might complete with new data, and the other one hasn't realized it collides yet. Basically it screws up optimistic updates. If we didn't have those we wouldn't have this sense of overarching ephemeral state.

My first thought is maybe look at the ephemeral state and see if the Transitions both write to the same one ones then we merge them. But we can have stuff like the Todos example where we have optimistic add vs optimistic edit, which can work independently but still be based off refreshing the same list.

We could treat these promises from Transition function as automatically forcing a merge. Basically revert to one singular future when there is an action involved. It's interesting because it means that we don't need the `resume` API necessarily if we are resolved to always to do this. Since realisically anywhere you'd call resume would be one of these tangled future scenarios. One nice thing of `resume` is it can error when the transition has already completed. But people really really shouldn't be calling this stuff in like `setTimeout` anyway. Like if they do it is on them.

I think that isn't terrible. It's unfortunate that we don't get to merge until we get to the end of the function and recognize it returns a promise. We need to be able to merge optimistic states at that time. I think it will be ok if we just play it as last one wins when not using the incremental version. But it is another complexity. Still probably better than automatically merging. In general we need to think about what happens if multiple seemingly independent Transitions write to the same optimistic state. I think I will revisit that after this.

In any case the most straightforward approach seems to just merge any would be Actions with each other. I'm trying to think if this could get us in trouble with non-actions but I'm not thinking of anything at the moment.

## Optimistic State

I did a previous post on this and just wanted to extend it a bit more as I thought through it. And I realized that if we pass the previous value to the setter we can actually handle more cases without Projections.

For example the non-merged optimistic case. Like how our actions work today:
```js
const [optimisticOnly, set] = createOptimistic([]);

set(prev => [...prev, newItem])
```

Notice the subtle difference from:
```js
const [optimisticOnly, addItem] = createOptimistic(
  [],
  (state, newItem) => state.push(newItem)
);
```
Where this one is mutable instead of immutable. So the first approach can be done with Signals only. In so it supports both simple updates like setting pending to `true` and simple optimistic updates that don't merge. Like TodoMVC example instead of Trello. That being said how nice these APIs are I almost want to do TodoMVC with the merge.

Anyway we coul play around more figuring out how this goes in the router actions API-wise but I want to get back to working on Transitions so lets focus on the more important aspects related to fundamentals like in the previous section.

When we call a set on `createOptimistic` it always impacts the main branch. So every change layers on top of each other. Which is tricky because it doubles down on not really being able to undo. Especially if we pass a history in. So we have to remove all optimistic updates at the same time. This alone suggests that overlapping `createOptimistic` ties these to the same Transition. A possible hint here also is if the optimistic update is derived from a source that would be triggered by the mutation.

Like Strello:
```js
const [boardWithOptimism, addMutation] = createOptimistic(board, (board, mutation) => {

});
```
When we invalidate the `board` the `createOptimistic` will also be participating in the Transition. I actually am not sure how that works, but it would be notified and cloned unless we special case it. It is quite possible we will have to. Maybe this is better figured out when we get there. But it is an interesting observation that optimistic updates do potentially tie us back to the the thing that is impacted. That being said it is impossible to know if it actually would be impacted. It could point at board but nothing cause board to update. Since the write side is what is inside the transaction it doesn't actually link back this way. The funny thing is since this is a special primitive only used in Transition scope we could do whatever we want with it. We could make this link. But I'm thinking it actually won't do what I'm thinking. 

Good have this thought out in the open.

Ok.. enough for today I need to do some work with what I've realized. Which is mostly we are going to have special cases for entangling but seems like we continue with Single Future.


