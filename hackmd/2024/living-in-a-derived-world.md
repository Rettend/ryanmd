---
# System prepended metadata

title: Living in a Derived World
lastmod: 2024-11-25
---

# Living in a Derived World

Everything is better when your data flows in one direction. When related things are derived rather than synchronized. However, it isn't always easy to represent everything in a derived way.

Solid even has a primitive to help with synchronization `createComputed`. But in a lazy reactive system these sort of primitives don't make sense. We only want to do the necessary work.

The gap left by `createComputed` though is a rather large one. In its absense people would fall to `createEffect` perhaps which can be less efficient. Not as impacted as React because of our granularity, but still not idea.

The answer is to push derived data even harder but we need to make sure we are up to the task.

## Dealing with Derived Mutable State

The most common case for synchronization is when you have some ephemeral state that needs to be edited before committing it back to the source. Perhaps you get an initial version through props and you want to be able to change the value until you save it/communicate the change to the wider system.

We are proposing a `createWritable` primitive to handle this case.

```jsx
const [name, setName] = createWritable(() => props.name)
```

The idea here is that `setName` can override the value that came from `props.name` but if `props.name` updates then that value is lost.

The advantage of this approach is that we can tell from a reactive graph perspective that `name` depends on `props.name` whereas the current solution could cause multiple executions. 

```jsx
const [name, setName] = createSignal(props.name);
const displayName = createMemo(() =>
  props.upperCase ? name().toUpperCase() : name()
);
createComputed(() => setName(props.name));
```

In the figure above I made the order intentional to illustrate but with more complicated pull based graphs this could happen regardless. Like if `props.name` and `props.upperCase` changes at the same time it is possible to run against the previous name before running again against the updated name.

`createWritable` is useful in a number of scenarios. Pretend you have some async data you want to edit before committing the change:

```jsx
const [track, refetch] = createSignal(undefined, { equals: false });
const user = createAsync(() => (track(), fetchUser(props.id)));
const [name, setName] = createWritable(() => user().name)

<>
  <input value={name()} onInput={e => setName(e.target.value)} />
  <h3>Preview</h3>
  <p>{name()}</p>
  <button onClick={async () => {
    await saveUserName(user().id, name());
    refetch();
  }}>
    Save
  </button>
</>
```
This example has a user being loaded from the server and `createWritable` projecting out the name so it can be edited. When the `Save` button is pressed we save the updated user name and then we refetch when it is done.

This is just illustrative. If we were using a caching primitive we could write to the cache instead of refetching and systems like Router Actions handle the revalidation/refetching automatically. But the idea is that the the temporal state lasts as long as it needs to before being merged upstream as a source of truth.

`createWritable` naively could be implemented like:
```jsx
function createWriteable(getter) {
  const x = createMemo(p => createSignal(getter(p && untrack(p[0]))))
  return [() => x()[0](), (newval) => x()[1](newval)];
}
```
And it would be perfectly sound if not a bit inefficient. In a sense it's a higher order reactive wrapper.

## Deriving Stores

The other case which is tricky is dealing with deeply nested Reactive data. It's often easier just to write to the store, but that requires synchronization.

The easiest way to introduce finer-grained updates is at the source. If you have data coming from the server resolving that could call `reconcile` and diff into a Store.. if you have some collection you want to represent on the client it should be created as a Store.

In addition if we have specific data fields that want to be incorporated into a Store we can use the `get` syntax to do so.

### Deriving to Stores

But what if you want to project less granular data to more granular updates? What if you treat Async as if it were derived? To do that you'd need to diff. Otherwise we don't know what changes. More important is that from a notification standpoint of what possibly changed we don't end up being more granular as every possible derived thing could have updated.

Picture something like:
```jsx
const user = createAsync(() => fetchUser(props.id));
const userStore = createDerivedStore(() => user());

createEffect(() => userStore.firstName, console.log);
createEffect(() => userStore.lastName, console.log);
```
Under the hood this could diff the previous and future values and then do granular updates, but everything that listens to `userStore` would need to be notified on `user` changing otherwise we'd break the propagation chain. All the effects that listen to `userStore` would need to be queued up even if ultimately nothing they listened to specifically changed.

To be fair a properly implemented `createAsyncStore` might have to have the same characteristics. So it feels like mechanically we need to explore this. I don't think there is a solution that doesn't involve looser notification. But we can defer diff until first read, only need to diff once per update, and still short circuit downstream execution if we can answer the question if a specific path has updated.

Its sort of the equivalent of React stores with selectors, but instead of checking at a bunch of components it's more granular on consumption. That being said this sort of data structure doesn't want to be large and scales with size similar to Redux etc, so that is a consideration.

`createDerivedStore` is the sort primitive that still needs to be developed.

> **Note:** In a sense `createSelector` is also in this category of derivation and an example of a way of optimizing. However it isn't purely safe either. While we can continue to have some internal hacks that we don't expose to end developers except through controlled tools. Ideally there is some deeper truth here that would allow this capability not to be needed or to be leveraged by all.

> Consider this example that would typically use `createSelector` based roughly on the JS Framework Benchmark:
> ```jsx
> const [selectedId, setSelectedId] = createSignal();
> const selected = createDerivedStore(() => { [selectedId()]: true })
> //...
> <For each={data()}>{
>   row => <Row selected={selected[row.id]} />
> }</For>
> ```
> You can  see that in a sense `createSelector` is just a specialized form of this problem. In a sense it is just projecting a Signal to a map of per row with the hope that only the changed values will re-execute. In this case they go between `true` and `undefined`. In this simple example by producing a new object each time with only the new key we implicitly set all other keys to undefined.

### Deriving Existing Stores

Derivations from Stores can come in many forms. Things like `createMemo` or `createWritable` are great for individual fields. I could picture someone using getter or a proxies, even a different store that accesses a different store/store field underneath:

```jsx
// proxy uppercases every string in the Store
const upperCaseStringStore = new Proxy(store, {
  get(source, key) {
    const res = source[key];
    return typeof res === "string" ? res.toUpperCase() : res;
  }
})
```
Of course writing this sort of logic might get tedious for some cases. Especially if you want to `createMemo` the result. You might find yourself extracting things and then putting the read in getters. It doesn't really work well if the data structure is dynamic. So I want to think about that sort of situation.

I think a good example here to think about is the "Trello Demo" popularized by Remix.

While technically you only have one data set each item has a position. It needs to know what column it is in and what order it is in, in that column. This in itself isn't hard to represent. It isn't hard to take a single data set and then map it out to different representation in the UI. Where the challenge comes in is merging optimistic updates.

Now maybe you don't need a store at all.

```jsx
const board = createAsync(() => fetchBoard());

const realizedBoard = createDerivedStore(() => {
  const notes = [...board.notes];

  for (const mut of mutations()) {
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
      case "editNote": {
        const index = notes.findIndex((n) => n.id === mut.id);
        if (index === -1) break;
        notes[index] = { ...notes[index], body: mut.content };
        break;
      }
      case "deleteNote": {
        const index = notes.findIndex((n) => n.id === mut.id);
        if (index === -1) break;
        notes.splice(index, 1);
        break;
      }
      // ... other mutations
    }
  }
  return { notes }
});
```
Now above would be a sort of brute force approach to this. You would recreate the board and diff it with any change from refreshing the underlying data or when optimistic updates are added. This is essentially what React does except they re-render components as well.

The thing is if you need to diff at some point in this chain that is the maximum granularity that we can expect from this part of the graph. So something like `createDerivedStore` pushes us to immutable changes whether it is all new data from the server or these immutable operations we are performing on our Trello Board with optimistic updates.

If we had made the board a Store upfront we wouldn't have had much benefit anyway because any change to it would have triggered this whole diff. So honestly if we made a `createDerivedStore` like primitive we could probably call this solved. But I feel like we can do better.

### The Nature of Reference based Derivation

I think an interesting observation here is because we are talking about references to objects immutable changes are the only safe approach when doing things like optimistic updates which can't be committed. Similarly the reasoning to have a derived store would to change the order or process some of the values being accessed of the underlying store without mutating it. However hierarchically that's tricky because of references.

```jsx
// because they have different elements
board.notes !== realizedBoard.notes

// in the beginning this could be true
board.notes[0] === realizedBoard.notes[0]
board.notes[0].id === realizedBoard.notes[0].id
board.notes[0].body === realizedBoard.notes[0].body

// now we edit the body
board.notes[0] !== realizedBoard.notes[0]
board.notes[0].id === realizedBoard.notes[0].id
board.notes[0].body !== realizedBoard.notes[0].body
```
It has to be this way because we can't edit the body for the existing note without editing the existing note and we don't want to do that with derived data.

Because of wishing to keep stable downstream references the only sane thing is to actually have `board.notes[0] !== realizedBoard.notes[0]` always but have every iteration of `realizedBoard.notes[0]` which has the same id be the same reference.

What I'm saying is that deriving from Stores can really only be done in the most shallow sense without requiring the need to re-introduce diffing. You can derive from a bunch of specific fields that pull from multiple sources, you can derive to existing deeply reactive values if you wish, but the merging of these into new values requires something entirely new which is hard to represent ergonomically through immutable interfaces because there is no current object, the best you can do is clone it to change a property. And that brings us to implicit merging again etc..

It is possible that with mutable ones we could accomplish that. Pretend we had something like `createProjection`:

```jsx
const board = createAsync(() => fetchBoard());

const realizedBoard = createProjection(board, board => {
  for (const mut of mutations()) {
    switch (mut.type) {
      case "createNote": {
        board.notes.push({
          id: mut.id,
          column: mut.column,
          body: mut.body,
          order: mut.order,
        });
        break;
      }
      case "moveNote": {
        const index = board.notes.findIndex((n) => n.id === mut.id);
        if (index === -1) break;
        board.notes[index].column = mut.column;
        board.notes[index].order = mut.order;
        break;
      }
      case "editNote": {
        const index = notes.findIndex((n) => n.id === mut.id);
        if (index === -1) break;
        notes[index].body = mut.content;
        break;
      }
      case "deleteNote": {
        const index = notes.findIndex((n) => n.id === mut.id);
        if (index === -1) break;
        notes.splice(index, 1);
        break;
      }
      // ... other mutations
    }
  }
  return { notes }
});
```
However I'm not sure this precludes us from a diff alone because the mutations here aren't incremental. The board state will have moved forward, adding another mutation we wouldn't want to apply them all again unless we reset the board. But if we reset the board everytime then we don't know what the new change is and need to diff it.

What we'd need to do is apply each mutation once as it first appeared or all current at once at any time the board reset say from the result of a mutation being committed. The way we work with Transitions/Transactions often lends to staying in this optimistic state until all in flight mutations resolve so often the last step is just updating the board, and seeing no mutations.

## Incremental Derivations

So I think it probably makes sense to think about this as a category. Diffs are the heart of incremental derivations. Not diffing, but diffs. A description of what the change is rather than the realized projection of that change.

But when you are dealing with realized projections all you can do is diffing to get back to a diff. So this comes down to some degree data serialization. Like when we re-validate a model we get the realized projection not a description of what has changed. This is why diffing is often so near to async data.

On the opposite end the DOM itself is a realized projection. One place Solid still naturally does diffing (shallowly) is when reconciling lists. We realize our reactive data and then diff to update the DOM.

Signals are state, so they communicate generally in projections of that state. When a Signal updates we see the new value, and in some cases we can see the old value and do a simple comparison around it. So it takes some doing to talk in diffs.

Think about Trello. It isn't hard to collect all the inflight mutations say using `useSubmissions` from Solid Router, and it wouldn't be hard to be able to ask for only the ones since you last ran using timestamps. But knowing that the particular computation is re-running due to a mutation change vs the underlying board changing is tricky. When a computation re-reruns we don't know why.

Maybe that is something in an API:

```jsx
const realizedBoard = createProjection(board, (board, boardChanged) => {
  const toProcess = boardChanged ? mutations() : mutations().filter(() => mut.timestamp > getLastRun())
  for (const mut of toProcess) {
    //... apply relevant mutations   
  }
});
```
It isn't too hard to picture we could isolate the board change from the any tracking in the second function.

```jsx
function createProjection(source, process) {
  const c = createMemo(() => {
    const wrapped = wrapProjection(source());
    let sourceChanged = true;
    return createMemo(() => {
      process(wrapped, sourceChanged);
      sourceChanged = false;
      return wrapped;
    })
  })
  return () => c()()
}
```

And `getLastRun` could be done a number of ways. It could be your own timestamp, it could be something read from the reactive system.

The challenge here of course is similar to `createDerivedStore` again. While reduced the execution of our processing and know via our proxy + mutation exactly what changes, we don't know until we run it so we have to notify loosely again. I don't think there is any solve for that in a lazy system. Even if we propagated our diffs from end to end we can't know to shortcut (cancel propagation) unless we apply them.

## Conclusion

There are a lot of questions here. Mostly because what I've proposed hasn't been implemented anywhere that I'm aware of. `createWritable` and some sort of `createDerivedStore` seem like they cover the bases. But maybe not optimally. It is possible `createDerivedStore` (and `createSelector`) are just specialized versions of like a `createProjection` type API. Where the diffing is just one implementation of the second function.

I'm not sure. But there is a gap here. We need a primitive that can do diffing as part of the derived graph and it would be nice in some cases to present mutable API that could avoid diffing to incrementally and more granularly apply the changes in these nested derived scenarios.