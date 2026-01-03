---
# System prepended metadata

title: Rethinking Projections
lastmod: 2025-07-23
---

# Rethinking Projections

Projections mutate which immediately get us of a zone where we have to be conscious of the impact. I haven't thought of it much to date because all our projections worked on data they owned (like `createSelector` case) or data that wasn't being used elsewhere like feeding `createAsync` into a projection for the Strello demo.

But the truth is the projection was mutating that `createAsync` value and since it was doing so without using the setter it was just being ignored. But that is not great. What if the source was a store.. then it would be mutating a store that could be listened somewhere else.

We are breaking our rules the same way `createComputed` did. So how do we solve that?

Well strict ownership is one way. We could say that projections can only write to stores that are created from things they add to themselves that aren't already owned. But that doesn't really help with non-stores. And it has reprocussions on stores themselves.

## Getting to the heart of it

We need a mechanism to split signals into multiple signals. Or wire multiple signals through multiple signals. This is how we keep things fine-grained.

### Refresher on Signia

The biggest gap in solutions like Signia that rely on incremental computation is that they are still dealing with a single signal.

However, until you get to where you benefit from the split a single signal is kinda good. You have a single thing to subscribe to, and you can do a lot of things with it. Now the solution to optimize communication with a single signal is diffs. Not that you have to necessarily do a diff, but to have a diff format to communicate in.

Then the process of doing updates is:
1. Get diff from sources
2. Produce your own diff from those
3. Apply your diff to your data, and pass the diff along to your observers.

You don't even need to realize your data until you get to the end of the chain. Like if someone listens to it. But you would also need to store all those diffs until someone actually asked you for a value (on the chance they might). So in practice we do apply the diff as we go.

At the end of the chain something wants the value. You hit a point where it doesn't understand your diffs. Or the application is too general and it needs to do its own diffing. If you had a list of objects where one property changes on one of them, you are left scanning the whole thing for change and applying it.

Whereas if the output is granular you can just apply that diff to the one thing that has changed.

### Back to Stores/Projections

Signals are immutable, and stores are not. You can chain as many memos as you want with no fear of changing the source. This is why mutable derivations haven't really existed. Because mutating something isn't really deriving it.

What we actually want to do is granular derivation without mutating the source. In a sense a store while mutable is a collection of immutable atoms. But how hard is that to write?

Writing diffs is not particularly fun. It's why Signia examples always seem unweildy. Trying to write granular pass through seems tough too. I picture a bunch of getters that conditionally get overridden. Remember you need the output to be stable from a reference standpoint so the projections externals need to mutate but do the internals?

The key to this has to be proxies again. What we want is to be able to write things in a mutable way, capture those granular writes to propagage them but not actually mutate the sources. It's actually a lot like the new `reconcile` function in Solid 2.0. But reconcile has a lot of rules around identity for diffing purposes. Models need IDs etc... 

What I'm getting at is this problem is a lot like Immer but for the opposite reasons. We want a mutable API on the inside to identify fine-grained updates and it is more ergonomic. We want our data to be immutable to protect our sources. But unlike Immer want a mutable API on the outside for reference stability. And that is where I imagine the complications come in.

## Redesigning Projections

### Immutable Cloning

Ok so first of all we need immutable internals, even when doing a simple write. Picture if we have a list from the server that looks like this:

```js
[{
  id: 1,
  title: "Hello",
}, {
  id: 2,
  title: "World",
}]
```

And we want to add selected state on to every row. Now we want our projection to update whenever the source list updates and when selected state updates but we don't want selection to end up on our source list. Truthfully we could just project this on to a seperate object like I do in the JS framework benchmark but that side steps what I'm trying to do here.


```js
const list = createAsync(() => fetchList());

let prevSelected = null;
const p = createProjection((s) => {
  if (hasUpdated(list)) {
    reconcile(list())(s);
    prevSelected = null;
  }
  const selected = selectedId();
  if (prevSelected?.id !== selected) {
    const item = s.find(item => item.id === selected);
    item.selected = true;
    prevSelected.selected = false;
    prevSelected = item;   
  }
})
```

I see a couple issues here.. we didn't access prevSelected from the root so the way writing works today wouldn't see it as writeable. This is also not concurrent safe because we reference an outside variable so realistically we will want to store the previous selected state inside our projection.

The other issue though is that when we reconcile the list it doesn't know about selected so it will zero out all the selected before setting it back. Now if this was an optimistic update we wouldn't care because the source would ideally match the projection. So this isn't a new problem. 

Ideally you wouldn't notify until the end but that requires storing the previous value or storing the instructions to diff. Not to mention I'm getting by with the fact that selected doesn't exist on items. If we had to map that property on things would be a bit different. I will leave that for a moment. Because there is more to consider here.

For this to work immutably we actually need to clone the array and the items that swap selected toggles. Basically the Immer treatment. We could notify only the one selected node but internally we should swap the reference.

Ok so far so good. But that is a signal source. What if our source is a store? What happens if the user changes the `title` from the source. Well, we don't actually listen to the `title` in our projection. So it doesn't re-run on `title` change. Well since we assigned the item to the projection reading from the projection title will be reading from the same store so it will update without running the projection computation.

Well, until the selected state has changed because now it isn't the same store node anymore, its internals needed to be cloned. Ok so that isn't great. Just cause I mutated something now it doesn't update with the source. I could solve this by doing `deep` on the store, but that means we'd be reconciling the full store on every update. Basically we are turning the store back into a Signal. If this is our solution we should be communicating with diffs.

### Passthrough

What we actually want might be passthrough. We want a layer on top of the same source. Adding selected adds it on top. It's more like:

```
source             projection
{                  {
  id: 1,             <--
  title: "Hello"     <--
                     selected: true
}                  }
```

Now what happens if there is a collision? Ie.. we change title in the projection? Well I think the override holds until cleared. It basically ignores the fact the underlying title changes, unless the projection is listening to the title and re-runs.

So how do you clear it? We are in some different semantics now. Like `delete` either means remove something locally from the projection, or overriding something like it isn't there. What if your projection wants to have less properties than its source? I'm going to assume there is some ability to `reset` the projection (or some portion of it) to its source state.

What about arrays though? What if your projection sorts or removes or adds items? Can we assume that in the case of like optimistic updates where you basically get an instruction to insert an object the projection is also listening to the list? I think so because conceptually you know you need to update/reset based on the source updating.

But the question is if the source swaps the order of items, or adds an item themselves what's the expectation? If indexes pass through you might be in for some really interesting behavior. Like a filter actually wants to be shorter.

I wonder if that is the hint here. Arrays have length, so if the length would change then you can't passthrough beyond that length. If someone removes or adds an item then the source changing length is ignored.

It might just be simpler than that. Arrays are always cloned when written to. Treated like a primitive value. If you change the array the whole thing is blocked from passthrough. The item references will be the same so that would work, just the array itself. We don't need to clone up the tree for this or really anything with this passthrough model. We just have an extra proxy wrapper over everything (which we already have).

## Reconciling Passthrough

Ok so granular changes have a plan how do we deal with the reset when source updates. Well `reset` could be an operation but lets consider our example.

We don't need to `reconcile`. The source has already updated. If it was a signal we have it in its entirity. If it is a store maybe we already `reconcile`d or we triggered something that would update our projection (like adding a row).

To incorporate this change we need start from our base again and apply our changes. This is not an incremental change like selection change.

The simplest approach is take the code above and replace `reconcile` with `reset`. What does `reset` do. It iterate through all overridden props and retriggers those signals if their value differs from the underlying source before removing them, so on next read they will pass through.

Sounds reasonable, although if the projected value was removed then added again, it triggers unnecessarily. Also array changes would always trigger even if the projected data contained the same conceptual model, for example due to optimistic updates.

So we do want some ability to do key based matching here.

## Better Mapping

While we can always handle incremental instructions, is there any solution that gives us granular execution on less granular input.

Our selection example as depicted in an immutable system is:

```js
list().map(item => ({...item, selected: selectedId() === item.id}))
```
Solid has a map function that could optimize when callback is called, but `selectedId` is hooked into every row. However projections solve the selection part but aren't efficient at mapping.

### Hidden Hoisting?

Crazy idea but what if developers could hook into immediate context without it being used to transport down. Local context.

Instead of hoisting things out you could use it as a scratch pad and could be cloned on transition to be concurrent safe. In a sense the only reason effects have values in Solid 1.0 is for things like this. To allow diffing etc.

Leveraging this we wouldn't need to hoist to preserve things. So `mapArray` instead of returning a function to put into a memo, could just return the results.

```js
const mapped = createMemo(() => {
  return mapArray(list, (item) => {});
})
```

In a sense this is basically React Hooks. Why think of this?

```js
createProjection(s => {
  forEach(s, item => item.selected = selectedId() === item.id)
});
```
Since it needs access to the projections state it cannot be hoisted. Hence the idea. But maybe that sort of per row execution isn't neccessary. In this case `selectedId` would trigger every row anyway.

### Nature of Selection mapping

One reason projections are performant for selection is they project to a map instead of an array. O(1) lookup and set. If we wanted selection to notify at O(1) we need to make the decision at write time rather than at read. So if we really wanted to push this into the array then we have to re-run it always anyway. So a specialized `forEach` isn't helping this case except to initialize new rows which isn't expensive in this case. But could be in others.

I might just be reaching the limit of this selection example. Like even in an immutable system this is far from optimal:

```js
list().map(item => ({...item, selected: selectedId() === item.id}))
```

It's more like:
```js
list().map(item => {
  if (item.id !== selectedId()) {
    return item.selected ? { ...item, selected: false }: item;
  }
  return item.selected ? item : { ...item, selected: true }
})
```
Now picture if we stored our models in the normalized form:
```js
{
  models: {
   [id]: model
  },
  selectedId: id,
  order: [...ids]
}
```
Then selection change can be handled like:
```js
const selected = selectedId();
if (store.selectedId !== selected) {
  store.models[selectedId()].selected = true;
  store.models[store.selectedId].selected = false;
  store.selectedId = selected;
}
```
No iteration. So we have to be careful to not confuse the complexity with the shape. I do suspect that query based projections like we find in Sync engines tend to realize in Arrays but I think it's worth considering.

The act of taking normalized form to array is an easy immutable operation that requires no projection:
```js
store.order.map(id => store.models[id])
```
And it is beautiful too as with fine-grained stores `store.models[id]` should never change unless a model is deleted. `store.models` isn't going change.. only `store.order` when items are added, removed, or moved in the list.

So in a sense projections should happen ideal outside of array scopes. `reduce` then `map`. That `map` can even happen in the UI layer. Which means the way we've been doing projections outside of this article is actually correct and we need a better example.

To not confuse these things for the rest of this exploration I'm going to assume normalized form moving forward. To be fair it weren't it would be trivial to do:
```js
const normalized = result.reduce((acc, item) => {
  acc.items[item.id] = item;
  acc.order.push(item);
  return acc;
}, { items: {}, order: [] })
```

## Revisiting Strello with Passthrough

Strello doesn't really care about normalization because it can both move and update models. I'm sure it could more optimal in some of the mutations operations but that is beside the point. The anatomy of that sort of problem is:

```
if (primary source updates) {
  reset()
  apply any still existing updates
}
patch any new updates
```

Now conceptually we can play around with this a bit. Like apply all the updates on the reset path in one go and early return instead of sharing with the non-reset path. We could apply the existing updates on top of the source coming in so reset does less work. That isn't exactly easy though because if the projection is our scratch pad we don't have that ability necessarily.

Now if we are dealing with an immutable source like the server then yeah.. then this is all a Signal just clone as needed then reset. If I was making Strello this what I'd consider doing. It sucks though because mutations you apply for reset should be immutable and mutations applied for patches shouldn't. You don't want the same instructions needing 2 code paths.

We hit this while making the demo but ended up going down the full mutable path since no one cared if we mutated the data coming from server. But for the sake of this exploration I do care.

Let's try a more concrete example. I'm just picturing a scenario where you have an optimistic update that adds an item to a list that fires after some processing has been done. It has been applied already but the reset doesn't include that change yet so you need to apply that mutation again on reset. How can we do this without thrashing the UI.

The simple scenario of a primitive value changing then returning to its previous value without notifying is simpler to solve. Something like Alien Signals defered Signal evaluation would do it: https://github.com/stackblitz/alien-signals/releases/tag/v2.0.0

But arrays are not simple values. And removing a new item and then adding it back again would be very difficult to not trigger notification as the previous item would just be gone.

This is hard.. you can't mutate something immutable before you "reconcile" it in. I don't have an answer for this. You basically can't reset while a mutation is in flight. As I said Transitions could make this guarentee but this is required if you want to not blow away parts of the UI.

I'm not sure we we do right now because while we Transition on "refresh" we don't include the mutation currently. So there is a window right now. I think that is addressable though. I didn't originally because conceptually I was thinking things weren't stale until the mutation has acked that it succeeded but we would need to guard a bit more aggressively I think.

That beings said I don't expect people to hold it wrong necessarily just its sort of a consequence of what the API would allow you to do.

## Auto Reset

Ok another thought. If you view Projections as a tree of writableMemos could updating the specific source field cause the reset automatically in the same way. Basically Projections granularly override the sources until the sources update. If you override something that isn't there.. like a new `selected` field well then it won't auto reset that. But if you add an item to a list in a projection then, the source list updates it would reset at that point.

Maybe that is untennable for the reasons I mentioned in previous sections. Like how to control when source updates and you won't end up with wasted work. But it is a thought. The base case for like Strello would just involve assigning the list to the projection and and applying the mutations. There would be no `reset` or `reconcile` call. In fact I don't think there would be a call like that in any of the cases we've come across. Additional fields don't require `reset` and cases we have that in place mutate always want the reset in that case the source updates (they have to).


## Conclusion

Ok so I've written way too much in here already. This is one of the more disjointed explorations I've done in a while.

What I have concluded I believe, is passthrough with `reset` is the way. We will have to adjust to the implications of that but I don't think ownership of normal stores is jeopardized this way. Projections are a completely seperate tool. Like Immer is to MobX. This deserves more exploration but probably some prototyping first.