---
# System prepended metadata

title: Fixing Reconcile
lastmod: 2025-07-23
---

# Fixing Reconcile/Stores

The problem with mutable data structures is they need to keep references which means they must be mutated, but it means they have to own anything passed into them. Making it diffcult for them to share.

In basic cases things are fine. But if you build stores over shared sources like caches etc they can be mutated in ways unexpected. All it takes is a nested write maybe intended to replace, but instead merges and suddenly you have 2 identical entries in a list when you were just trying to swap positions.

A single store doesn't hit these sort of issues typically and because we keep a weak map of objects and their proxies we can freely keep store nodes in multiple location with no penalty. A change in one location notifies change at all.

So clearly there are some powerful characteristics found here that exceed immutable data stores, but can we fix these issues while preserving them?

## Understanding the Challenges

To me this starts with:

1. To ensure we don't override source data we need to deep clone everything stores are given. Ie what is initialized and everything being set. However this means equality checks won't work in the future with its source. We can't tell if references have changed because even store internals no longer reference it. Stores have the clone and a proxy.

2. Our clone should be structured but we can't just use `structuredClone`. It needs to respect/stop at nested proxies since we don't want to clone those. A setter might only work on a small part of store but we want to keep references for all. This means we need a custom clone mechanism.

### Cloning Internals

The first point has a lot of consequences. When does it not matter? Fresh server data doesn't matter as no shared references between the store and new input is possible. But otherwise we can't assume something set is the same as its source. You can't use a Store as previous state in an immutable structured diff.

This already suggests that we might need 2 different operations here. One for diffing fresh data (from the server), and one for managing immutable diffs (like Redux).

On the immutable side I could picture, a `applyDiff(store, nextValue, current)` function that compares the next value against the current and then applies the diff to the 3rd object the store.
```jsx
const buffer = createMemo(([prev]) => [reducer(prev, action()), prev], []);

const store = createProjection(draft => {
  applyDiff(draft, ...buffer());
})
```

Honestly probably not that different than getting a diff with Immer etc.. but I think having the `key` argument is still important to be more optimal around arrays. We could say this is limited to normalized data structures but lets come back to that later.

The other operation `reconcile` would still exist but operate with less modes. With this setup it has no choice really but to do merge. Key can help it not hijack everything but without reference equality shortcutting and with the Store owning its own sources I see no reason why you would attempt to keep the most stable references as possible.

### Structured Operations

Honestly merging scares me in general when things can live in multiple locations. They might not all be array siblings which can be managed by `key`. This is even more primary that diffing.

Consider difference between:

```js
setStore(draft => {
  const l = list();
  draft.list = l;
  draft.selected = l[0];
})
```
And
```jsx
setStore(draft => {
  draft.list = list();
  draft.selected = draft.list[0];
})
```

A simple implementation these would have different results. Since everything is cloned entering the store the first example makes 2 copies of list item `0`, one in the list and one that is selected. These would update independently. Whereas in the second version we could know that they are the same item because we are reading it from the store and don't need to clone it again.

This stable proxy-object identity is important for equality and for things like moving items in a list. You don't want to create new item everything it is wasteful and you don't want to merge what is there if it wasn't conceptually the same item as that would be `non-keyed`.

We have global proxy-object map so we can do that, but if we wanted the first example to work the same we'd need to do some extra smart when managing cloning. The only way we know that these are the same objects are the source reference but would we keep it around indefinitely? Well that is one option. Have immutable internals we could always compare against. But arguably we only need to keep this information for the lifetime of the `set` operation.

This issue also caries to diffing considerations. Consider if we `reconcile`d this with a different current product, say product 3. We don't want to transform existing product 0 into 3 as it would update it in the list as well assuming we were able to preserve linking. `key` could protect against this.

But the much harder problem is how do we get it to share reference of product 3 in the list? Otherwise they'd now be unlinked. Unless keys were globally unique they won't help.

## Finding a Solution

Things are infinitely easier if there were no shared references, but I don't think I could make that decision. The exploration above was incomplete but let me conclude a couple of things.

1. Immutable diffing can short cut on matching references whereas reconciling will never match references so it ends up deep diffing always. However this would always be true of data is from server.

2. Shared references establish identity internally. The input of a diff methods shared references are the intended linkage in the final result. `key` lets us link between input and store but only as a tool to preserve the shared references. While shared internal references from the server seem unlikely it is the only assumption we can make. Seroval/server functions handle this. And deduping could be done in user space if desired.

3. For any of this to work we need the source input to be linked to the store. Whether that is temporary for the length/scope of the `set` or for all time is an interesting question. When we didn't clone `store === prev`. But we can't make that assumption anymore.

I'm not clear yet the overlap of the different diff/patch operations or that we won't realize that even having the prev value temporarily is insufficient. But I am of mind that the alternative to handling cloning internally puts a lot of extra on the developer. Although having to be aware of shared references does that too.

### Can Cloning on Write Be a Thing?

I guess this is even more fundamental question before we get to `reconcile`. This is hard topic because it feels the performance is the make or break. But what do we need to implement it.

The first thing we need is an additional Weakmap I think. Like we know for any object if there is a Solid Store proxy for it. We don't want to keep making new proxies for the same object. However, if we clone we also probably don't want to keep making new proxies for the same source reference.

It's interesting because we could have a situation due to key matching that several objects are assumed to be the same. But that only works if those sources are immutable. If someone starts mutating them.. ie change what their key is then things get all tangled up too. Obviously within the same scope this looks obvious:

```jsx!
setStore(list => {
  const baseItem = { id: 1, name: "John"};
  list[0] = baseItem;
  baseItem.id = 2;
  baseItem.name = "Aiden";
  list[1] = baseItem;
});
```
Seperating it out might be less so.
```jsx!
let index = 0;
const baseItem = { id: 1, name: "John"};

setStore(list => {
  list[index++] = baseItem;
});

baseItem.id = 2;
baseItem.name = "Aiden";
setStore(list => {
  list[index++] = baseItem;
});
```
This would end up with an array with both the same `{id: 1, name: "John"}` proxies. But the whole reason we are doing this is so people feel like they can own their objects. This is just the problem in reverse. Instead of mutating their object, we are ignoring the mutations on theirs.

So we could say we only keep this lookup for the length of an individual `set`. We use a similar trick for making stores untrack. This would atleast fix the second case. Too specific?

But how does that help us with keyed operations like reconcile.. I guess they would also keep their own set because the default behavior wouldn't recognize keys.

So how do we handle this during the actual assignment. We `unwrap` incoming things when setting them. We could implement this cloning behavior into `unwrap`. Like it already stops when it hits an existing proxy. We could pass along a `Set` as second argument which could be a secondary lookup for Proxies.. ie ones that had already been registered. We might need to use a global here to have it get into the internal setter Proxy trap but that seems doable.

I guess we have a path forward. Just need to benchmark it to see if it is viable.

## Defining a Diff Format (Immutable)

I promised I'd get back to diffing so here we are. I guess the first question is do want to define a diff format ourselves? There is something attractive especially if we seperate the diff from the patch. That can happen in different places then. It's a bit less performant but probably not in a meaningful way. That being said this responsibility could be delegated to 3rd parties like Immer.

Solid's Store's path syntax actually started from my desire to describe many changes almost like patch. We originally supported passing in arrays of arrays to do multiple changes in a single set. In that process I started thinking a lot about what the ideal format would look like. To be efficient it would want to be hierarchical so that all changes down a specific path could be done in a single go. And it would need to have the ability to define operations succinctly.

Immer is a good example minus I don't believe they support key based diffs only referential. Which is fine for most immutable cases. Michel wrote some great stuff about [patches in Immer](https://medium.com/@mweststrate/distributing-state-changes-using-snapshots-patches-and-actions-part-2-2f50d8363988) many years back.

Researching this I found it is roughly based on a JSON patch standard: https://datatracker.ietf.org/doc/html/rfc6902/#section-4.1 and https://jsonpatch.com/

Immer changes the path to arrays as that is more optimal. But it bugs me that this is a bit less optimal because it is flat. This doesn't optimize for creation or application. What if I made it hierarchical?

Let's start with something based on the immer docs:

```jsx
import {produceWithPatches} from "immer"

const [nextState, patches] = produceWithPatches(
  {
    user: {
      age: 33,
      name: "John"
    },
    tags: ["yellow"]
  },
  draft => {
    draft.user.age++;
    draft.user.name = "Jake";
    draft.tags.push("red");
  }
);

// produces:
[
  {
    op: "replace",
    path: ["user", "age"],
    value: 34
  },
  {
    op: "replace",
    path: ["user", "name"],
    value: "Jake"
  },
  {
    op: "add",
    path: ["tags", "1"],
    value: "red"
  }
]
```

Could be:
```jsx
[
  [
   "user",
   ["age", { op: "replace", value: 34 }],
   ["name", { op: "replace", value: "Jake"}]
  ],
  ["tags", "1", { op: "add", value: "red"}]
]
```
Now this allocates more objects so it is less efficient on memory. It is smaller to serialize. But it is harder to produce too because how did we create this.

At one point the patch looked like:
```jsx!
[
  ["user", "age", {op: "replace", value: 34 }]
]
```
It isn't efficient do the lookup on existing path by array index. Sure this is only one here but let's look at objects instead:
```jsx!
{
  user: {
    age: { $op: "replace", value: 34 },
    name: { $op: "replace", value: "Jake" }
  },
  tags: {
    "1": { $op: "add", value: "red" }
  }
}
```
Using `$op` because you need to be able to identify the objects here as operations. This output is smaller still and uses even less memory (that could change with deeply nested paths). But we'd need to ensure order or object properties. Picture if someone added something to the 2nd index of a list, and then added something to the beginning. If you processed them in alpha numeric order you'd produce the wrong operation. It would insert in the front and then at the 2nd index which has since shifted.

We also need to consider multiple operations at the same path. Sure a replace/copy/move operation overwrites but add/remove shift things. It is quite possible to add say multiple things at the same index. And that could be kept as an array, but then we lose order between adjacent operations.

Same problem with nesting really. Like adding an item to array, mutating it, and adding an item at the same index.

```jsx!
list.unshift({ id: 1, name: "james" });
list[0].name[0] = list[0].name[0].toUpperCase();
list.unshift({ id: 2, name: "daniel"});
list[0].name[0] = list[0].name[0].toUpperCase();

// as:
{
  0: [
    { $op: "add", value: { id: 1, name: "james" } },
    { "name": { 0: { $op: "replace", value: "J" } } },
    { $op: "add", value: { id: 2, name: "daniel"} },
    { "name": { 0: { $op: "replace", value: "D" } } }
  ]
}
```
So far so good, but can we break this? One thing to note is once order is involved we can no longer combine ops. Like if we were to update a different property on this user record we couldn't put it in the same object unless the last reference wasn't an op.

Real question is it ok if order doesn't reflect. Like consider:

```jsx!
list.push({ id: 1, name: "james" });
list.push({ id: 2, name: "daniel"});
list[0].name[0] = list[0].name[0].toUpperCase();
list[1].name[1] = list[1].name[1].toUpperCase();

// becomes
{
  0: [
    { $op: "add", value: { id: 1, name: "james" } },
    { "name": { 0: { $op: "replace", value: "J" } } }
  ],
  1: [
    { $op: "add", value: { id: 2, name: "daniel"} },
    { "name": { 0: { $op: "replace", value: "D" } } }
  ]
}
```
This does the operations out of order. Can this get us? I understand that hand crafting diffs won't likely be a problem but I want to make this as easy to generate correctly as possible.
```jsx!
list.push({ id: 1, name: "james" });
list.push({ id: 2, name: "daniel"});
list.splice(1, 0, {id: 3, name: "Duncan"});
list[0].name[0] = list[0].name[0].toUpperCase();
list[2].name[2] = list[1].name[1].toUpperCase();

// becomes
{
  0: [
    { $op: "add", value: { id: 1, name: "james" } },
    { "name": { 0: { $op: "replace", value: "J" } } }
  ],
  1: [
    { $op: "add", value: { id: 2, name: "daniel"} },
    { $op: "add", value: { id: 3, name: "Duncan"} }
  ],
  2: { "name": { 0: { $op: "replace", value: "D" } } }
}
```
Still good. Ok maybe this works. The only operations might be suspect are "move"/"copy". These exist I think so you don't have communicate references. They use a reference to a source path which if processed out of order could cause unexpected results. But maybe aren't necessary with seroval since we dedupe references already. Although I'm not sure how we'd ever produce it.

Looking at Immer's source they don't. It is only "add", "remove", "replace". This means that if someone did want to do a "move" operation they could expected to ensure it is in key order. So maybe this is ok??

Why I like this hierarchical format is while order is compromised it works of depth first which is efficient when applying the patches and isn't that inefficient for creation.

Our last example with Immer would be by comparison:
```jsx!
[
  { op: "add", path: ["0"], value: { id: 1, name: "james" }},
  { op: "add", path: ["1"], value: { id: 2, name: "daniel" }},
  { op: "add", path: ["1"], value: { id: 3, name: "Duncan"}},
  { op: "replace", path: ["0", "name", "0"], value: "J" },
  { op: "replace", path: ["2", "name", "0"], value: "J" }
]
```
Which is by no means bad and quite readable. It is slightly larger to transport but produces one less object in memory. And actually looking at the operations performed this example actually doesn't benefit from heirarchical sharing since you only need to traverse into a path if the path length is longer than 1. So both end up with 4 traversals. But adding even one layer of depth to the base would easily show the benefits.

So it is quite possible I'm overengineering my thinking here and we should just expect people to use Immer here. I don't hate that it takes out of our hair and to be fair Immer also produces reverse patches which is genius really as this addresses some of the other concerns about operations being reversable. Mind you this is only applicable in the structurally referenced immutable space. And doesn't help us with server data unless the server communicates the diffs.

Like it is quite possible that this zone is really only interesting to things already communicating in diffs and `reconcile` should pick up the rest. Atleast identified this area can develop independently of other store efforts.
