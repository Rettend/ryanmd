---
# System prepended metadata

title: Exploring Mutable Reactivity
lastmod: 2025-02-17
---

# Exploring Mutable Reactivity

While we've lived with this for a while I think this is an area that is finally prime to be explored. Thinking in reactivity in terms of mutable and immutable is not something that I've seen done all that much.

So lets start thinking about mutable vs immutable operations. The ones that immediately come to mind are for lists.

| Immutable | Mutable |
|-|-|
| `map` `flat` `flatMap` `filter` `reduce` `slice` | `forEach` `pop` `push` `shift` `unshift` |
|`with`|`a[index] = _`|
| `toSpliced` `toSorted` `toReversed` | `splice` `sort` `reverse` |

Categorically the last two rows are just immutable versions of the mutable actions. It is also possible to clone then mutate to perform any mutable action in an immutable way. So in a sense immutable actions are a superset of mutable ones.

Similarly `reduce` could be used to implement every single immutable operation. You can implement `map` or `filter` with reduce if you want to. It isn't always the most optimal to do an `O(n)` operation but as a baseline you can. In general, all immutable operations are `O(n)` here but with varying costs. The benefit of mutable is that it can be `O(1)`.

So what does this have to do with reactivity? Well when someone asks the best way to map/filter a `Store` you need to consider the implications of applying immutable operations to a mutable source. Does it work? Is it the best way to accomplish the goal?

## `.map`

I want to start by looking at the `map` function since it is one of the most primary operations in building UIs. Afterall, `UI = fn(state)` is a map function at its core. Derived reactivity like `createMemo` are map functions. But `createProjection` is not. It is more of a `forEach`.

So mapping is at it's heart immutable. But we can map over mutable data. One of the benefits of doing so is that it can update independently of the map running. If your data is immutable the only way to update the mapped values is to update the source and remap it.

```jsx!
const doubler = v => v * 2;
let array = [1, 2, 3];
let doubledArray = array.map(doubler);

// add a new item
array = [...array, 4];
doubledArray = array.map(doubler);
```

Obviously we can take this example and make it reactive so there is less repetition. The same with Signals is:
```jsx!
const doubler = v => v * 2;
const [array, setArray] = createSignal([1, 2, 3]);
const doubledArray = createMemo(() => array().map(doubler));

// add a new item
setArray(prev => [...prev, 4]);
```
But ultimately this is the same thing. Whenever we add a new item to the end we:
1. Clone the array with the new item.
2. We map over all items of the array to produce another array.

This example above allocates 4 arrays by the time we are done. Now conceptually we could remove one of those allocations by not cloning on write.

```jsx!
const doubler = v => v * 2;
let array = [1, 2, 3];
let doubledArray = array.map(doubler);

// add a new item
array.push(4);
doubledArray = array.map(doubler);
```
And the same could be accomplished by Signals if you removed the equality check.

You could also remove an allocation by not mapping over the array again.
```jsx!
const doubler = v => v * 2;

let array = [1, 2, 3];
let doubledArray = array.map(doubler);

// add a new item
array.push(4);
doubledArray.push(doubler(4));
```
This has you writing the code differently though for creation and update. In a sense you can always apply changes at write time instead of deriving values using shared code from creation.

And actually you can also avoid allocations here by only storing the final results.

```jsx!
const doubler = v => v * 2;

let doubledArray = [doubler(1), doubler(2), doubler(3)];

// add a new item
doubledArray.push(doubler(4));
```
Now there is a single array. There is no more `map` function anymore. Arguably this is the most optimal way to write this code if you only care about the final results.

There are reprocussions though. There is no history. No idea of a previous value. You don't necessarily need it but it isn't there. Explicit knowledge of all operations needs to happen at the point of change. If you have two locations updating doubleArray you need to know to `doubler` in both locations. If the list also then needed to be sorted you'd need to make sure that applied in both places. It is also more difficult to follow for more complex operations as it can be less declarative. Instead of describing what the final output should look like you are describing the necessary changes to get to that output.

Often you do need that intermediate value anyway. It is applied to other computations at which point if you want to communicate a change down the line you have only a couple options. Recalculate it (ie.. need history), provide information about what has changed.

```jsx!
const doubler = v => v * 2;
const [array, setArray] = createSignal([1, 2, 3]);
const doubledArray = createMemo(() => array().map(doubler));

// any operation
setArray(/* ?? */);
```

With the code above it doesn't matter what the operation is, we can be confident that doubledArray will be correct. Whereas consider a mutable example:
```jsx!
const doubler = v => v * 2;
const [array, setArray] = createStore([1, 2, 3]);
const doubledArray = createProjection(value => {
  while (array.length > value.length) {
    value.push(doubler(array[value.length]))
  }
}, []);
```
Sure this works for creation and additions, and does so optimally. It doesn't recreate the array on each update. But what happens with an `shift` operation or a `splice`. We'd need a lot more logic in here.

It would be safe to say that you basically need a diff to apply derived mutable updates. So is this any different than being immutable?

Well it is if the diffing stops there. Any additional change or derivation would only apply to a relevant part of that data rather than the whole thing. If only one index in our array updates we don't need to notify things that depend on the other. We've forked the reactivity stream so to speak. With Immutable operations at minimum any change is `O(n)`

I'm not making any conclusions yet but I hope it is atleast clear that immutable and mutable approaches to operations requires a complete flip in thinking.

## Templating is a `map` function

This concerned me at one point because in theory if JSX is a map function then we end up iterating over the list twice. Once in the JSX and once over the DOM to diff. Couldn't this be combined into a single update? And the answer is yes but it didn't end up mattering as much as I thought. A shallow Diff isn't always the most expensive and the portability afforded by not compiling say a `<For>` components into direct DOM operations is helpful in making things multi-platform. It's the child JSX that makes the DOM operations and `<For>` is just a special map function.

So what makes it special and what does that have to do with mutable/immutable data? Well it means that to be optimal we need to diff here. In fact every JS framework I'm aware of diffs for their list management in their templating. What I've come to realize though is that there is not a single answer for how to do this. The type of map function you want is most optimal depending on the the type of data input.

In SolidJS  thanks to core and Solid primitives we have multiple. And I realized that each has its best usage.
 
![MapQuadrants](https://hackmd.io/_uploads/BkGXly_byx.png)


Most frameworks only have Immutable control flow so I will start there. I will go around clockwise starting at `Index`.

------
### Key by Index (Immutable - NonKeyed)

![NonKeyed](https://hackmd.io/_uploads/Hk0pE1_b1l.png)


This is the baseline for almost all UI frameworks. What happens here is when the list changes it is always associated with the index. What ever is at the first index in the array is assigned to the first created DOM element. If the first item is removed, the last DOM element is removed, and all the data shifts up the dom elements updating the attributes and elements there.

In React it looks like:

```jsx!
<div>{
  list.map((item, i) => <Row index={i} item={item} />)
}</div>
```

In Svelte it looks like:

```html
<div>
  {#each list as item, i}
    <Row index={i} item={item} />
  {/each}
</div>
```

In Solid it looks like:

```jsx!
<div>
  <Index each={list}>{
    (item, i) => <Row index={i} item={item()} />
  }</Index>
}</div>
```

In VDOM frameworks they tend to iterate over the whole list running all callbacks and then match up index with DOM elements when applying the changes. In reactive frameworks we tend to cache the mapped rows and update the row data at the index if it has changed. In Solid is particularly clear what is going on here as the index is a constant and the item is a signal. 

#### With Immutable Data

When dealing with immutable data the list is always updated on any change which means this map function will always run on any change. The entries at any updated row are new references. This means items that aren't changed versus their previous index don't need to be updated. However, something like our `shift` operation while not actually creating any new references moves the position the array causing all equality checks to fail. Moving items are seen as new items with this approach which makes it less optimal for those sort of operations.

That being said sometimes this leads to less elements moving around which can be beneficial for performance in terms of repaints. This comes at at a steep price (see "Explicit Key" section).

#### With Mutable Data

With mutable data we don't need to recreate the array if something nested updates, so we don't always need to run this map function. Only array operations that would add or move items would trigger it. However in those cases since moving items are seen as new it isn't a particularly efficient way to do those operations for mutable data.

#### Takeaways

* item data can change but index is constant
* best suited for immutable data as any change would cause re-execution anyway
* best suited if the row data doesn't move or is removed, or if it can't establish an identity (ie, a primitive value)
* not recommended outside of suitable cases but sometimes can be a performance boost by saving repaints.

-----
### Explicit Key (Immutable - Keyed)

![Keyed](https://hackmd.io/_uploads/rkhOc1O-Je.png)

This is the recommended approach for most frameworks. Many have warnings in the docs or even in the development environment if you use map functions without a key. The idea here is that the same row data is always associated with the same UI element. That is when you `shift` a row from the data the first DOM element is removed and the other elements around it stay unchanged.

While we like to pretend `UI = fn(state)` the DOM is stateful with things like form state, focus state, webcomponent state, CSS transitions etc.. so using non-keyed approaches can have severely detrimental side effects if you are moving elements around. You can read more about that [here](https://www.stefankrause.net/wp/?p=342).

In React it looks like:

```jsx!
<div>{
  list.map((item, i) => <Row index={i} item={item} key={item.id} />)
}</div>
```

In Svelte it looks like:

```html
<div>
  {#each list as item, i (item.id)}
    <Row index={i} item={item} />
  {/each}
</div>
```

In Solid it looks like:

```jsx!
<div>
  <Key each={list} by="id">{
    (item, i) => <Row index={i()} item={item()} />
  }</Key>
}</div>
```
This works similar to non-keyed with the exception that now things are considered equivalent only if they have the same key. This requires a bit more complicated logic as when items are moved the underlying algorithm needs to find them and then run the map callback function(or update the signals) if the value or the index has changed. Again in Solid's example it is clear since both index and item are signals both can change with this approach.

> **Special Note:** Keying is only valuable when it establishes identity. An array of primitive strings that feed into inputs would cause a lot of chaos as every character would be seen as a new key causing the input to be unmounted and recreated losing focus.
>
> ```jsx
> <div>{
>   list.map((item, i) =>
>     <input value={item} key={item} onChange={
>       (event) => setList(list.with(i, event.target.value))
>     }/>
>   )
> }</div>
> ```

#### With Immutable Data

As with non-keyed any change will lead to this routine running. But with keys the number of map callbacks (or signal updates) that need to happen can reduce. This benefit might be more obvious with signals as moving a row only requires an index change and if the row isn't listening to index then nothing updates. Memoized components can do a similar shortcut if the props don't change.

One other benefit is when references are completely lost like fresh data from the server this approach has the key to match up on. So while row callbacks and signals all update if the server change also moved rows around the overall differences in values should be kept minimal.

#### With Mutable Data

Again nested updates don't require this routine to run so it is only array operations like `push`, `shift`, etc that trigger it. This isn't particularly poor way to manage mutable data, but it requires more signals to manage than necessary. Being mutable in nature an item with the same identity have the same reference so the extra check is only beneficial if that reference is somehow lost, maybe fresh data from the server. But for that to have happened then all the downstream reactivity was replaced as well. Basically a state you never want to be in.

#### Takeaways

* item data and index can change
* best suited for immutable data as any change would cause re-execution anyway
* best suited for most non-primitive situations

-----
### Key by Reference (Mutable - Keyed)

Most frameworks don't have control flows with mutability in mind, so I won't have examples in React or Svelte. But this is Solid's default way to do lists.

```jsx!
<div>
  <For each={list}>{
    (item, i) => <Row index={i()} item={item} />
  }</For>
}</div>
```
This method works very similar to explicit keys but relies on the fact that nested reactivity keeps references. In so you can see that the index is a signal but the item is constant.

#### With Immutable Data

This approach works mostly the same as explicit keys. Any change will cause the item reference to no longer match so it recreates it. The one gap here is that if you lose references there is no explicit key to bring things back to matching. It will always recreate the rows. So for fresh data from the server this isn't the best choice for immutable data.

#### With Mutable Data

This is similar to Keyed except it removes an unnecessary Signal wrapper and has the slimmest syntax so far. You don't have to worry about keys etc... In cases where the row doesn't depend on the index no rows/signals need to be updated on any changes from the perspective of the map function. If the array updates then it is just a matter of adding/removing/moving rows. If nested values update then the map function doesn't trigger as well.

#### Takeaways

* item data is constant but index can change
* best suited for mutable data change as it removes unnecessary overhead
* best suited for most non-primitive situations

-------------
### Repeat (Mutable - NonKeyed)

Lastly we need to consider the non-keyed scenario with mutable data. Again being non-keyed has considerations (see Explicit Keys section above) so it isn't what you should always be reaching for.

I'm calling this `Repeat` after a component I made a [long time ago](https://codesandbox.io/p/sandbox/solid-gl-boxes-lmpei?file=%2Findex.jsx%3A5%2C8-5%2C14) that is also a Solid primitive. Again this is not a common control flow in frameworks.


```jsx!
<div>
  <Repeat count={list.length}>{
    (i) => <Row index={i} item={list[i]} />
  }</Repeat>
}</div>
```

This control flow doesn't even take the list as an argument, and the index is constant. Like `Index` technically the row can change but because it is granular we don't need the map function to manage it. If the list changes order or moves items then the granular reactivity will just update. `list[i]` will no longer be the same and it can notify that without re-running over the whole list. And since we don't need the list to provide keys there is just no need to pass the data in.

#### With Immutable Data

This control flow seems like it could just replace index but there is one key difference. Without nested reactivity(proxies) the above looks more like:

```jsx!
<div>
  <Repeat count={list().length}>{
    (i) => <Row index={i} item={list()[i]} />
  }</Repeat>
}</div>
```
Notice it becomes `list()[i]`. And you can see that every time the list updates all rows need to evaluate. regardless of the change. Whereas `Index` provides the signal per row ensuring more granular updates. It does the diff for you.

#### With Mutable Data

Mutable data doesn't need the diff and doesn't need Signal to be provided as the Store already has one. The index is constant. This differs from `<For>` where we needed to project an index signal over the map. So basically unless the length of the array changes the map function here doesn't need to do any work. It isn't even responsible for moves. It just handles additions and removals. Much more optimally than using `Index`.

#### Takeaways

* index is constant, item data isn't required
* best suited for mutable data change as it is inefficient for immutable data
* best suited if the row data doesn't move or is removed, or if it can't establish an identity (ie, a primitive value)
* not recommended outside of suitable cases but sometimes can be a performance boost by saving repaints.

_____
### Concluding Thoughts on Control Flow

It might be awkward that there are 4 different methods. This is only increased by the fact that in terms of algorithm efficiency favors mutable and non-keyed. It is possible to combine all but `Repeat` realistically into the same syntax with configuration. But does that reduce cognitive overhead?

It also begs the question are all operations equally split. Will there be 4 versions of `filter` or `reduce`?

## `.reduce`

Well I guess to answer that question we should look at `reduce` as we stated earlier it is the most fundamental immutable operator. If you solve for `reduce` you solve for `filter`. `map` is special because of UI we've already solved it but `reduce` I have not seen as part of any standard reactive tools unless you count reducing derivations. More similar to `fold`, ie feeding the previous value into them.

```jsx!
const sumFn = (acc, v) => acc += v;
let array = [1, 2, 3];
let sum = array.reduce(sumFn, 0);

// add a new item
array = [...array, 4];
sum = array.reduce(sumFn, 0);
```

What appears to me right away is that the final value can't be calculated without running through the whole list. The accumulator suggests order matters too.

Now speficially or a sum operation I could see it being made optimal if one could reverse(subtract) and apply the new value granularly. But this sort of reversal isn't always possible and it is a smell that we don't have a generalizable solution.

We can't make that assumption about `reduce` in general. At minimum we'd need to run all the rows after the change since what accumulator change could affect downstream calculations. But to do this we'd to store the accumulator at each step, which is fine for primitive values or immutable accumulators but not for ones that are mutated.

So you have to stop and consider what you are optimizing for at this point. Is it the iterations of the callback or the final output. The reason we care so much about mapping is because the mapping itself is expensive. But here it isn't so clear. If we are reducing to a single value the rendering at the end isn't going to be the expensive part but the calculation. But more expensive that holding all the sub-results in memorry and immutably cloning it?

Maybe but it makes it hard to talk about this one generally. There could be a general solution but specific solutions would generally be more optimal.

I think we should look at categorizing the solutions. What makes `map` work pretty well and `reduce` not so well. `map` is isolated and one to one which means that granular changes are trivial. `reduce` has no such guarentees. Now if you were mapping one to one then maybe it could but that is only a subset of potential operations.

Like this has the same characteristics as `map` but is a `reduce` operation:

```jsx!
const dedupe = (acc, v) => {
  acc[v.id] = v;
  return acc;
};
let array = [
  {id: 1, name: "J"},
  {id: 2, name: "P"},
  {id: 3, name: "L"}
];
let normalized = array.reduce(dedupe, {});

// add a new item
array = [...array, {id: 999, name: "X"}];
normalized = array.reduce(dedupe, {});
```
This like our earlier examples can be "optimized":
```jsx!
const dedupe = (acc, v) => {
  acc[v.id] = v;
  return acc;
};
let normalized = {};
dedupe(normalized, {id: 1, name: "J"});
dedupe(normalized, {id: 2, name: "P"});
dedupe(normalized, {id: 3, name: "L"});

// add a new item
dedupe(normalized, {id: 999, name: "X"});
```
Admittedly this only would be interesting if `id` changed as it is acting as the "key". Otherwise nested updates could easily take care of the rest. This is an example that wouldn't have the same overhead, but also the work the accumulator is doing is hardly expensive. Still it could listen to array changes, check them against existing keys and only assign and remove the necessary entries.

That's 2 examples (sum, normalize) where a general `reduce` operation would be less optimal than the specific solution. And I suspect this to be true in most cases. The accumulator API makes optimizations hard to generalize. We've looked at one to one(map, normalize), and many to one(sum). That leaves many to many. The simplest many to many doesn't combine rows and happens to be another operation.

## `.filter`

The first optimization that can be made is if the `filter` returns the same results not to notify downstream. Mind you that is the most trivial case for `map` to handle. It will go over every entry see no change and move on.

```jsx!
const isOdd = (v) => v % 2 !== 0;
let array = [1, 2, 3];
let oddArray = array.filter(isOdd);

// add a new item
array = [...array, 4];
// this doesn't need to happen because no new elements pass the test
oddArray = array.filter(isOdd);
```

Another potential optimization would be that only the callback functions impacted by a reactive change would re-run. It's interesting because generally we don't track callbacks in our control flow operators. But this is a case where perhaps it would make sense?

Let's think this out. If the filter condition changes then all rows would need to re-execute. Like if we changed from checking from `isOdd` to `isEven` we'd need to check all the rows again. So that doesn't get us anything.

If the row data changed though then we could choose to only re-evaluate the row that changed. This is only a consideration with nested mutable reactive data as immutable data would always replace the whole source array. If a change was found then we'd produce a new array and notify downstream. And if nothing changed then the other optimization would need to be present. 

The thing though about `filter` is I don't know that the callback function is ever the expensive part. You filter to reduce downstream work. Interestingly filter always results in the whole array updating because it is always an add/remove operation.

So there is potentially little to gain in optimization of `filter` when put against the overhead of book keeping. Unless maybe we communicated the diff? Let's look at that.

-----------
### `filter` + `map`

Well we need something on the otherside that understands the diff which brings us back to our `map` function. Our `map` function already does a shallow diff so we have to put that up against additionally supporting detecting changes and serializing it and then applying them.

I did a test for this a while back and found it didn't make a meaningful difference in terms of the JS framework benchmark. I think this might be worth spending time on in the future to see if there can be gains, but to date I haven't seen this being worthwhile. In the same way that adding the second `map` function in Solid's rendering didn't make meaningful difference.

Ultimately the same things get mapped but it is a matter of saving the iteration and shallow reference check. The only real savings here is if we could cache the mapped version between filter changes, but that isn't something that feels like it could be done reasonably automatically.

Maybe weakmaps + Offscreen? Basically there is always going to be cost to keeping things around unless we know we should keep it around. We can make versions to do that today even but it probably needs to be deliberate.

## Conclusion

So what am I saying? This topic is very large. It is interesting to see mutable Reactivity lead to new thinking in the types of optimizations that can be done. But I think atleast as of today because we will constantly be moving between this mutable and immutable world there are clear locations for optimizations and others that are more specific. Coming up with general tools here is going to take some time.

There are still a lot of optimization that comes with using mutable reactivity even with the immutable helpers because they don't need to run in as many places. `map` is by far the most important one and handles I imagine the vast majority of cases.

But I feel there is a couple more big realizations to have here before we end up getting this all to release.