---
# System prepended metadata

title: Stores vs Projections
lastmod: 2025-07-24
---

# Stores vs Projections

I recently made a demo where I showed we could make immutable mutables that could rely on either path or reference: https://playground.solidjs.com/anonymous/762bad76-02e3-4d0c-ad37-7040675208d0

That's all great but now the real question is how to proceed. I find sometimes writing things out helps me here.

The core of the decision is around whether Stores should change. What characteristics are the same between these primitives and which are different. We have quite a few dials to play around with here.

## Requirements

So maybe let's start by describing the primitives and identifying the axis of decisions.

### 1. Stores

Stores are the writable version of mutable reactivity. The equivalent of Signals. They require reference stability if the expectation is that they are portable and are the source of truth.

#### Proposed Behavior

*Reference Identity* - Must
*Path Identity* - Could
*Reconcilable* - Should/Could
*Source Guarded* - Could
*Reconcile on Write* - Could/Won't

### 2. Projections

These are the derived version of mutable reactivity. The equivaloen of Memo(computeds). They require their sources to be guarded with passthrough and they must be reconcilable to handle converting course grain to finer-grained updates.

*Reference Identity* - Should
*Path Identity* - Could
*Reconcilable* - Must
*Source Guarded* - Must
*Reconcile on Write* - Could

## Primitives are the Same

Starting simple. As a base if we assume these are at their core the same solution things this solution then that solution must have Reference Identity, be Reconcilable, and Source Guard.

### Musts

That isn't a huge requirement. Reference Identity is managed by keeping a global Weakmap or using a $PROXY symbol on objects. Being Reconcilable can take different forms but doing so with Source Guards means source swapping. Solid 2.0's Stores have that already. The difference with complete source guarding is that `unwrap` becomes a creation operation and that can be more expensive.

Solid's stores in 1.0 were optimized for serialization via `unwrap`. In 2.0 we have slightly de-opted. But this would be different. `unwrap` would give you a completely different object. It wouldn't be unwrapping so much as here is a non-reactive clone.

Why optimize for serialization. Saving large data to the server. Is this still a thing where the web is heading? ...maybe I should be making a different bet?

### Coulds

Funny enough there are no Shoulds as a Should of one is a Must of the other. So we are just left with the 2 other characteristics and they are related.

Path identity is something I'm realizing things like Svelte do by default. It's also how Immer or any immutable library works. I don't think it is necessary but it makes reconciling a lot easier.

Like we need special rules for reconciling... like keys otherwise we would have no choice but to rely on path. It's why Immer recommends normalization and I imagine Svelte doesn't have a `reconcile`. The problem is arrays. Reconcile gets pretty hairy if objects become other objects based on index instead of some sort of key or id. So if a primitive used Path Identity by default it could diff easier in the basic cases but now the key field would be part of the primitive instead of the helper.

Which is why you need it if you are going to reconcile on write by default. Why would we want to reconcile by default? It is a super common operation when doing Projections. You take a course grained change and try to make it fine grained. However it isn't the only case. You could be doing fine-grained to fine-grained. However most fine-grained changes are inexpensive to merge so you might find this just a simplification.

### Option #2

So I see 2 options really for keeping things the same. We do just the Musts or we do it all. The first option is fine and the only potential casualty is `unwrap` performance.

The second option has the more interesting consequences. Every Store would become Path Identity except for things denoted as "Models". This suggests a Key based system. But to be portable this would have to be respected globally. So it becomes interesting in that you'd need perhaps truly unique keys, not just to the specific model. Would you create a meta language around models/collections to ease the burden here.. offer optional schema's? I mean it is interesting but it is also a whole new world.

It is probably worth mentioning Svelte reactivity is Path Identity. I probably should check what Vue is. So there is some precedence even if I think the real power here is in reference identity so that state can be shared rather than syncronized.

## Diverging Solutions

I'm a little more skeptical on this. The reason to do it would be that Stores could be made a lot more performant than what we want to do with Projections. It is most likely if we want to force all behaviors above with Projections but not Stores.

At first I was thinking these primitives are different enough, but I'm not so sure anymore. I'm not sure a more expensive `unwrap` is divisive point. It's possible that Stores could be even more performant by not being `Reconcilable` in the same way. Like I can picture a much simpler Store implementation, but is it worth the mental split with Projections? Unlikely.

## Answering Remaining Questions

I think the "coulds" above are probably the only real fracture point and we need to understand the implications of those before we make a decision. So I guess I have the topic to explore next.

It boils down to:
1. Does reconciling(diffing) all the time have issues?
2. Is it realistic/clunky trying to enforce models/collections?

I think the first is probably the most important question as the second has more play. And as always it comes down to arrays.

### Array Assignment

A non-keyed array diff is simple. It basically works the same as an object. Property === index more or less. You just iterate and compare the value at the index diffing farther as you go.

Keyed is trickier because you need to find the item already in the list to match it up to continue. If it is not in the list then it's new and you don't diff. It is you continue on from that index, and old items also get removed.

Keying is also important to do at this point because as soon as you allow one part of the chain to be unkeyed the rest of it isn't. So if you want keyed updates you need to keep stable references from the start. The reason not to diff arguably is that we can usually assume an array has changed if someone bothered changing it and differ the actual diff until the end (where we insert it to the DOM). Because diffing at the data to find that you need to update the list reconciled further down anyway because say length changed is pretty wasteful, as you end up diffing again. If you communicated in diffs maybe this wouldn't be as big of a deal but most operations don't need the additional diff.

Most of the time you explicitly `reconcile` I find in Solid is not about the list changing but specific items in it doing so. Like even the Strello demo, the only `reconcile` runs when you expect the diff to basically reveal no change on the happy path. It's a fallback not and expected change.

Now arguably the main place this full re-assignment happens is coming in from 3rd party systems if we start leaning on a mutable API. Like if we use `.push` instead of `[...old, new]` it communicates quite a different operation. The latter has to be diff the full list, the first doesn't. Probably.

Well is that true. What if a model already exists in a list and you are adding an updated version of it. Should we be checking the other items? Depends on the scope of the model identifier. If it is global then we don't need to. It should just recognize the incoming model and update it everywhere.

Obviously a push would always trigger the array update anyway because the length changed. And directly setting an index would do that too (arrays a little special). So we don't stop downstream diffing in most cases but we don't need to diff all the other elements here even when keyed for these simple operations.

### JS Framework Benchmark Example

Thinking about the JS Framework benchmark it has several keyed operations. Could a always diff system still operate optimally under it?

1. Add 1000/10000 rows

```js
setStore(s => s.data = createRows(n))
```
This is unchanged because if the list is empty we basically bypass the diff, because it is all new.

2. Replace 1000 rows

This is the same code getting called as above but items are already in the list. In the benchmark we know there are no repeats so one could "cheat" by clearing before set. But I think that goes against the spirit of the test. This unfortunately would lead to a shallow diff on data set. It would realize nothing matched, but not before checking every item (in case a nested item needs further diffing), and then it would diff again at the insert point.

3. Update every 10th row

```js
setStore(s => {
  for (let i = 0, d = s.data, len = d.length; i < len; i += 10)
    d[i].label += " !!!";
})
```

This sets a primitive value so no diffing.

4. Select Rows

This uses a projection to manage index so again no diffing.

5. Swap Rows

```js
setStore(s => {
  [s[1], s[998]] = [s[998], s[1]]
})
```
This works off an index switch which would shallow diff the items being switched. Since these are models it would diff all the keys in the new location. This might have a tiny overhead. But this operation triggers list reconciliation anyway and there are only 2 listened to properties so it might be unnoticeable.

6. Remove Row

```js
setstore((d) => {
  d.data.splice(d.findIndex((d) => d.id === rowId), 1);
})
```
Hmm.. this one actually is pretty problematic. The proxy traps would see this as an index change for every item after the change. So it would independently diff each of those. If keyed look up was global this might be somewhat ok, but non-starter for non-global keys that would need to test against the array for every index. O(n^2) is unnacceptable here.

7. Add 1000 rows

Classically we would do:
```js
setState(s => s.data = [...s.data, ...buildData(1_000)])
```
But this is more expensive with diffing than probably:
```js
setState(s => s.data.push(...buildData(1_000)))
```
If we assume global keys. It would all be new data so the lookup would be cheap with no diffing. 

8. Clear Rows

This one is a clear so it is cheap from a diffing standpoint.

-----
Ok.. so hmm.. it might be worth pointing out that none of these scenarios want data diffing so the penalty on 2, 5, and especially 6 would not be wanted. I could make an argument for 2 maybe, if you view it as the filtered query case where some items stay on the screen, but 5 and 6 are fine-grained operations where their intent doesn't carry diffing with them.

And the reason is a proxy can't tell the difference between a move and a set. In fact none of our semantics really can. A move doesn't require diffing unless it is also a data update. And we can't encode that information in a single mutation.

### No... wait I'm wrong.

There is way to tell between a set and move. A set has a previously non-proxied value and a move would have the existing proxied value. So yes cases 5, 6 would see a proxy and know not to diff. Splice still hits the proxy trap every index after the change but that is the problem with mutable updates in general.

Then with this knowledge just how bad is setting a new array if those items are all proxied? `O(n)`. It isn't free but isn't necessarily super expensive. It still might be enough that it is less preferential in like the splice case to hitting every index which it is today. Also Case 2 is still more expensive than I'd like since it also needs to go through and realize that non of the item keys match.

But it it is good to know that there are shortcuts here for performance. The only real cost here is that at minimum with always diffing system you will be shallow checking every index of the array on set of the full array which would otherwise wouldn't need to happen.

There is a world where this cost probably isn't too bad on performance and the magic it allows is pretty compelling. But is the cost of being explicit here bad? I don't think so. We could easily just not diff in all these scenarios.

Well at least I think so. We haven't really looked that deeply on what maintaining source guards looks like. There is a sort of diff like quality to that solution. And there may be some nice qualities for even localized explicit diffing we make global "models" a concept.

## Designing Source-Guarded Stores

So let's assume atleast automatic diffing is not happening for a moment. Path based could be still on the table but general we are building towards Option #1. What does that look like data structure-wise?

I'm going to assume that to keep it reconcilable against immutable sources we are going to keep a swappable reference. We also are going to need a write override, and reactive node collections to answer both `get` and `has`.

That's up to 4 extra objects per node not counting the proxy itself. To be fair if we wanted we could use prefixes but that would be a string op on every access and we'd need to be sure we weren't colliding.  In the past since most of these objects are optional I haven't gone down that path but it is something we could look at. I don't think it changes the shape of the solution though from the outside.

```ts
interface StoreNode<T> {
  value: T
  override: Record<keyof T, isWrappable(T) ? StoreNode<T[keyof T]> : T>
  get: Record<keyof T, Signal<T[keyof T]>>
  has: Record<keyof T, Signal<boolean>>
}
```
This is my first thought because we want to have overrides even when no one is listening to save us from creating Signals. Although that is another point of synchronization. Also it is possible to have someone listening to a property before it is ever overridden. Which is awkward because if the underlying property is a store(in the case of a Projectioin) we still want to listen to it.. we should just be creating a Signal.

I suppose the easiest way would to make it use the potential memoized form and rely on the fact that it won't be reactive in a store to release it.

```js
createSignal(prev => value[property])
```
Of course this has an interesting condition situation because we don't want the source to override here on update. Just be a fallback when there is no value present.

```js
createSignal(prev => prev !== undefined ? prev : value[property])
```
I don't think this works, if source updates while being overridden it will stop listening to it (and anything) even if the override is later zero'd out. It is more like we want:
```js
createMemo(() => property in override ? override[property] : value[property])
```
But that requires an extra signal and memo. This is actually potentially tricky to model efficiently. And only a potential concern for Projections. Projections with non-store sources don't need this treatment.

So I guess the important part here is recognizing where Stores and Projections are different. Stores value should presumably always be raw, where Projections can have Stores as values. However we don't want Projections to keep wrapping themselves as you move stuff inside them. It does suggest there is some form of ownership here. If only to say I've already wrapped this one. It's enough for Projections (global) to just have their own symbol, it needs to be unique per projection.

It also feels a good time to reality check here if we need special treatment for anything that isn't a Projection over a Store. It's arguable we don't, but I think if we decide guard sourcing it's because we want consistent behavior. So lets assume we do.

### Back to Stores

Stores and Projections can use the same mechanisms except Projections can wrap over Stores. Since that condition is detectable that may be the only situation we need more complicated reactivity logic (reactive passthrough). So this means store mechanism does not need to worry about that and an use Signals that initialize on read. Which suggests a solution similar to what we have today except with overrides when not listened to.

Probably a good place to start. I honestly am not sure how to get projections over Stores to be efficient but I guess one thing at a time.



