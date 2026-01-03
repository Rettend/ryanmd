---
# System prepended metadata

title: Lazy + Derived Fine-Grained is Hard
lastmod: 2024-12-04
---

# Lazy + Derived Fine-Grained is Hard

This is something that is more and more evident in my exploration. I am attacking this mostly theoretically so I can find the API interface I want to build towards but there are some hard truths here.

## Notification

In a lazy system we notify before we do anywork. You do an update and mark everything as possibly dirty all the way down to queuing the effects, and then the effects pull the dependencies. They go up the chain until they find something that is actually dirty and re-evaluate it, continuing back down if it has actually changed.

Non-granular chains are easy.. you can see the path (A -> B -> C). But granular derivations is hard. We would need to notify everything.

If you have a single source and multiple outputs you'd expect on source change all the outputs could be updated and need to be notified.

```
  A
 / \
B   C
```

If you have multiple inputs you'd expect if either changes the outputs could change so they'd need to be notified.

```
A   B
 \ /
 / \
C   D
```

But what if they weren't actually dependent
```
A  B  C
|  |  |
D  E  F
```
Like what if we are just talking about different fields in a store-like interface. They may or may not be related.

Once deriving via a function we open up the possibility of cross depedencies. This differs from source Stores themselves where each point can be treated seperately. Once combined, splitting apart is impossible.

> **NOTE:** Now we actually have an example in Solid today where we do look at these related things seperately, "props". `mergeProps` or spreads basically. We never combine the objects but instead line them up on their property name. This keeps them separate. They aren't deep. They can't change order like an array. But the logic there is already pretty complicated.

Is there an alternative? Well not a "correct" one. Not one that guarentees each node only runs once. But it's impact can be reduced. `createComputed` basically. If you do the work in certain cases on notification or queue these computations to run before effects pull you could avoid most temporary tearing. Keep in mind this is pure phase so the impact is limited but it still is possible.

With a "some writes are ok" as long as they happen early approach you can keep notifications granular.

Why bring this up? This is an unavoidable truth in this area regardless of what we are trying to accomplish. A big goal has been to remove `createComputed` and making writes during the pure phase illegal. While it is something we aspire to it might be difficult to reach that today in a performant manner.

More than likely internally we will be leveraging this mechanism for performance reasons. It asks the question are we better to keep this in framework space and make developers follow the cleaner model, or should we hand them the potential footgun?

In [Living in a Derived World](https://hackmd.io/@0u1u3zEAQAO0iYWVAStEvw/Sk9MYIgPA) I gave a bunch of examples to think through. But I think we can generalize to 2 concepts: Local & Broadcast Diffing.

## Local Diffing

Derived Diffing is the most common scenario taking the next State and finding the diffs to update the required state to morph the exist state to the next State. This keeps references and works well as long as the next state isn't shared elsewhere.

Examples of this are `createSelector`, `mapArray`, `createAsyncStore`. In all of these we get the next state and through diffing notify the right things. These also all are currently are not "correct".

`mapArray` does properly diff and map, but if the position changes we write to an `index` signal which happens inside the `createMemo` call.

`createSelector` collects computations itself rather than adding itself as a depedency and then calls the computations directly when something has changed.

`createAsyncStore` basically uses `createComputed` to call `reconcile` on a internal store.

Not going to lie we are probably not going to change this. Maybe just see if diffing part of `createAsyncStore` and `createSelector` can be universalized. It would be nice if there was a single primitive to handle all of these sort of cases. A immutable -> Store convertor. `mapArray` I imagine remains a special case.

This area atleast is well understood. These are the problems everyone hits when they first move to being fully reactive. For simple cases this is a sufficient solution because once you diff at a certain point you can generally handle the rest granularly.

But it is important to recognize this always goes from realized value to realized value. If you hit a similar situation downstream, you need to diff again there. In theory maybe we should be able to only need to diff once.

> **NOTE** We have this situation in Solid. We will diff your array in `<For>` to produce any new DOM nodes, but then we diff again in `DOM Expressions` when deciding how to insert the DOM nodes. Our diffs on the DOM side are highly optimized so it isn't notable compared to the cost of actually communicating that diff information. But theoretically we could do less work.

## Broadcast Diffing

This is less explored to the point I don't even have a target from API standpoint. But the key here is sometimes we need to communicate in diffs rather than realized values if we want to reduce work.

### Signia's Incremental Computeds

Only work in JS I've seen here is from TLDraw's Signia. [Incremental Computeds](https://signia.tldraw.dev/docs/incremental) can be used as a generic way to handle this. This example creates something like like Solid's `mapArray` in userland. You can also see the logic is not much simpler either.

Observations:

1. It is a single Signal still. Immutable changes. Nested changes can't independently trigger.

2. Every node in the chain needs to participate. Each need to produce their own diff.

3. Each node needs to apply the diff. To handle initialization or reset of downstream nodes the current value also needs to be communicated.

What I'm getting here is that we are dealing with immutable data. References will be lost. Diffs help get this information back but then you pay the cost the whole chain. And in some cases like with fresh data from the server there are no stable references. Something needs to "key" the models and that isn't present in Immer. That's React pretty clearly here. (*I just went and confirmed it is React, which makes a lot of sense now.*)

This is powerful but completely wasted on our granular updates. Not to say the Signia API couldn't work. Just what if it wrote to Stores rather than immutable drafts? That'd be the end of the diffing line.

My thinking after looking at local diffs was that diffing could avoid future diffing but it doesn't. It actually lends to more. What it does do though is allow immutable atoms to act fine-grained-"ish" in the same sense React Compiler makes React Fine-grained. But why settle for substitutes when you have the real thing?

## Single Primitive?

So there are times where we'd want to communicate in diffs. I'm beginning to think all cases might be the same `create` primitive. Let's call it `createDerivedStore`.

```jsx
const user = createAsync(() => fetchUser(props.id));
const userStore = createDerivedStore(() => user());

createEffect(() => userStore.firstName, console.log);
createEffect(() => userStore.lastName, console.log);
```

It has built in `reconcile`. If when refreshing from the server the firstName changed but the lastName did not then we'd only see one of the logs. I talk about this in [Living in a Derived World](https://hackmd.io/@0u1u3zEAQAO0iYWVAStEvw/Sk9MYIgPA).

Let's use our Trello example. We have a list of optimistic updates we would like to apply incrementally. It would be great to be able to only apply the new ones as they came in and when new data that came from the server came in have it reset and apply all current mutations. It would be even better if new models that showed up optimistically could match to the data on the server when it refreshes.

This was the failing in my previous exploration. I assumed we didn't want to diff at all. But no other solution is really suggesting that. What we want do is save real downstream work.

Now what if we took some Signia inspired APIs here.

```jsx
const board = createAsync(() => fetchBoard(), {
  historyLength: 1
});

const realizedBoard = createDerivedStore((prev, lastEpoch) => {
  const diffs = mutations.getDiffsSince(lastEpoch);

  // first time, insufficient diff history in mutations, 
  // or running due to board updated
  if (!prev || diffs === RESET_VALUE || board.getDiffsSince(lastEpoch)) {
    // clone board and apply all mutations
    return applyMutations([...board()], mutations());
  }
  // we only care about new entries
  return applyMutations(
    [...prev],
    diffs.flat()
      .filter(patch => patch.op === "add")
      .map(patch => patch.value)
    );
});

function applyMutations(notes, mutations) {
    for (const mut of mutations) {
    switch (mut.type) {
      case "createNote": {
        notes.push({
          id: mut.id,
          column: mut.column,
          body: mut.body,
          order: mut.order,
        });
        break;
      }
      case "moveNote": {
        const index = notes.findIndex((n) => n.id === mut.id);
        if (index === -1) break;
        notes[index] = {
          ...notes[index],
          column: mut.column,
          order: mut.order,
        };
        break;
      }
      // ... other mutations
    }
  }
  return notes;
}
```
This is an approximation. And what it is missing is how we actually generate the mutation list from optimistic updates. Something like:

```jsx
const createNoteSubmission = useSubmissions(props.actions.createNote);
const editNoteSubmission = useSubmissions(props.actions.editNote);
// ... more actions

const mutations = createMemo(() => {
  const mutations = [];
  for (const note of createNoteSubmission.values()) {
    if (!note.pending) continue;
    const [{ id, column, body, order, timestamp }] = note.input;
    mutations.push({
      type: "createNote",
      id,
      column,
      body,
      order,
      timestamp,
    });
  }

  for (const note of editNoteSubmission.values()) {
    if (!note.pending) continue;
    const [id, content, timestamp] = note.input;
    mutations.push({
      type: "editNote",
      id,
      content,
      timestamp,
    });
  }
  // ... more mappings
  return mutations
}, [], {
  historyLength: 10,
  computeDiff: (prev, next) => // Immer/However we generate the diff
})
```
I don't know if this API is preferable or if it would be required to bring in something to do diffs(like Immer) in the simple case. But by getting a diff from mutations and knowing if the board has updated since the last time `createDerivedStore` ran, we can create incremental immutable updates and have them reconcile against a stable referenced store. That means optimistic updates could be applied one by one without triggering everything and that even things added during optimistic updates would retain references if they still existed after the board updated from the server.

From my perspective that solves the problem more than adequately.

## Conclusion

So what am I saying. I think we only need a single derived store primitive. `createDerivedStore` or whatnot. Not the final name. It would be interesting if it could also replace `createSelector` but performance might not allow it.

I think that incremental computations are interesting prospect. I prefer an API where the decision is decided outside the computation function I think no (`withDiff`). This will have perf overhead so it definitely needs to be opt in which suggests between that and making it customizable our built ins wouldn't be diff aware.

I think it isn't just the diffs that are interesting but the idea of when last run. This answers the question of did I trigger this computed to run. Even if you didn't immediately if it hasn't run since you last changed that's probably good enough. I think something on this dimension would be useful. Even without diffing ability built in. Like do mutations need to be a seperate memo to communicate the diff? Can we accomplish the same without being built in? But I will leave that to another exploration.