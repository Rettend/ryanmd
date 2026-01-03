---
# System prepended metadata

title: Reference Swapping Stores
lastmod: 2025-02-17
---

# Reference Swapping Stores

## Solving Stores

I realized that if I added one layer of abstraction inbetween the stores value and the proxy and I ensured that the signals in the proxy always stored wrapped (proxy) values that I could reconcile without mutation. The proxies would stay referentially stable but the underly values could change.

What I mean is instead of mutating the underlying object we swap the reference and only mutate the Signals that exist in the proxy. This removes the overhead of updating things not being listened to and allows in a world where we only reconcile not to need to clone.

We only create Signals for properties being used and we now release them when they are no longer listened to. Which means that `reconcile` can do a lot less work. You could change the shape of your store but if you haven't referenced it anywhere the operation is simply swap the the reference. We don't need to go deeper because no one is listening, they will see the new reference when they do access it. 

As it turns out this is the most performant approach I've probably ever had with Stores + `reconcile`.

## Coming to terms with the Fundamentals

I spent a lot of time looking at trying to solve shared references, but there is only one truth. If an object is expected to appear more than once and be treated as the same thing it needs to have a `key`. It is that simple. Our only options are full replace which can be inefficient or merge which can mess with things.

This approach I've shown above doesn't change that. Even when changing underlying references there is a difference between changing to a different model(identity) and merging one into another. The latter should never happen. I'd get rid of the `merge` option altogether and always merge with the caveat that anything that appears more than once needs to have a `key`.

We need better mechanisms to handle keys at different levels for sure, but fundamentally it is that simple. If something needs appear more than once, it needs to have a `key`. Basically without keys we can try to do something reasonable with:

```js
reconcile({
  list: [itemB, itemA],
  selected: itemA
}, {
  list: [itemA],
  selected: itemA
})
```
But it will never be what we want to be doing. At worst we end up with a list with 2 `itemB`s in it and selected becomes `itemB`. At best we cause a bunch of extra re-rendeering as we end up creating a new proxy for `itemA`. While we can't exactly error here this is not a problem worth solving. Use a `key` if it could appear more than once.

I thought about how React solves this sort of problem because technically they ultimately are reconciling with the DOM, and the saving grace was actually that a DOM node can't appear in more than one location. You can have basically identical VDOM nodes but they will be different DOM nodes.

Now I thought the problem might just be with `reconcile` and we could do immutable diffs. But once you are setting values in the Store (ie applying the patch).. you still have a problem. Everything in the store has to be a clone or you risk mutating the source immutable structures.

At minimum you are keeping immutable reference to diff, producing some sort of patch instructions and cloning everything that is inserted. The last 2 steps aren't needed in a purely immutable system. So this was never going to be our optimal solution. And immutable diffs don't help with diffing existing stores like we do with Projections in Trello demo. We need `reconcile` to work and for it to work well.

At a certain point I realized that I'd have to accept that Stores mutate regardless, but if we want `reconcile` to work performantly without doing so we'd need the ability to work like a pure immutable system under the hood. We can't be cloning everything whether at input or at set. Losing references will always catch up with you.

The second time you `reconcile` the same model today because it is deoptimized because it can't tell that it has changed via reference. The first time you reconcile it morphs the original model into the values of the second, the next time even if you pass the exact same second model again it doesn't see it as itself because it is still the first model that was morphed.

However if you could change the target of the Proxy under the hood it would know nothing has changed if the 2nd reference equals the new reference. And if you only mutate the signals in the Proxy to reflect the new underlying reference you never have to mutate any of those references themselves.

## Other Caveats

I have recognized one problem with this approach and I think it is a bit tricky to "solve" cleanly. It's easy to solve but not cleanly.

The problem is when the top level store has the key. Or whatever you are reconciling has the key. At top-level we can only merge. I think this actually might be the source of some of the issues we have with current stores. This is more obvious with the API I am using in this example where reconcile takes both objects flat.
```js
reconcile(next, store);
```
But picture:

```js
const state = {
  id: 1,
  name: "John"
}

const next = {
  id: 2,
  name: "Jake"
}
```
On the surface there doesn't seem to be a problem. But consider if the store is used in multiple places. Other stores that aren't being reconciled. The only operation we can perform here is morphing state into next. This is not the expected behavior as you don't want to change all references to user 1 to user 2.

Even with my swap references approach I can't "fix" this. I can avoid mutation, but since those other locations use the same proxy and we aren't re-assigning the parent.. they still effectively morph into user 2. Sure we didn't mutate the source user 1 but the proxy points at the wrong one because of our reference swap.

The difference when nested is that when we see the child has a different key we reassign the value on the parent. This doesn't cause the "merge" to happen. In a lot of ways this makes sense.

Like if picture something like:

```js
setStore(s => {
  reconcile(selectedUser(), s.selectedUser)
})
```

You probably wouldn't do that. You wouldn't reconcile changing some user into the new selected user.  You should replace.
```js
setStore(s => {
  s.selectedUser = selectedUser();
})
```

However if we just error when attempting to reconcile a top-level object with a key then we can't easily just store a model in createAsync + createProjection and have it diff. While this is logical I don't know it is expected. 

Like consider:
```js
const user = createAsync(() => fetchUser(props.id));

const diffedUser = createProjection(s => reconcile(user(), s));
```

This would error if the user id changed.

You could try to mutate it yourself but that's not good because you would be mutating user 1 to user 2. It would be more obvious I suppose.

```js
const user = createAsync(() => fetchUser(props.id));

const diffedUser = createProjection(s => {
  const u = user();
  if (s.id !== u.id) s.id = u.id;
  reconcile(user(), s))
}
```

This would mess up the original user 1 in a state where the id would be mutated but the name would be the original value. You could mutate all the properties to not leave it in a half and half state instead of reconciling in that case but it is making the old references messed up.

So solutions.. obviously nest.
```js
const rawUser = createAsync(() => fetchUser(props.id));

const diffed = createProjection(s => reconcile({ user: rawUser() }, s), { user: {} });

const user = () => diffed.user
```

Then you'd have to reference it `diffed.user` but if the user changed from id 1 to 2 it would trigger in those locations you are listening to diffed.user you see that's the problem with top level it could only update properties essentially making it impossible to not mutate the old reference.. user isn't reactive, `user.name` is. 

The other option might be to nest in createAsync. But that still requires nesting data structures.
```js
const diff = createAsync(prev => {
  const u = await fetchUser(props.id);
  if (!prev || props.id !== prev[0].id) return createStore(u);
  prev[1]((s) => reconcile(u, s)); // setStore
  return prev;
})

const user = () => diff()[0]
```

And it is a bit like `createEffect` problem. Detaching the write from the computation. To be fair it is still localized so it is unlikely to cause problems.

Both work, but neither are very clean way to handle a fairly common case. Honestly I wouldn't go the second way. The first is the better way. But it makes it awkward for top-level API. 

This could push people towards things like `createAsyncStore` which I wasn't sure would make the transfer. What I don't like about `createAsyncStore` is that it tells you where the diff happens. And as we found for things like Trello sometimes the diff is better to happen after you'd done some client side work like applying optimistic updates. This is easy to solve once aware but its another thing. It might be a very fundamental thing. You can't reconcile two objects with a different identity. It makes sense to me. But would it make sense for everyone?

## Takeaways

1. If something has identity it needs to have a key. If it can appear in multiple places or has other different things of the same "type" then it needs a way to indicate its unique identity.

2. Stores mutate. Their performance benefit comes from doing granular updates. If someone mutates something it is mutated.

3. `reconcile` is not be a mutation operation. It resets the store to suggested references. That way the next time you reconcile it can do so again and always be able to referentially tell what changes.

4. You can't `reconcile` 2 objects that have a different identity. You can't `reconcile` one identity into another.