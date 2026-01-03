---
# System prepended metadata

title: Is it ever Safe to Write to a Signal in a Derived Computation?
lastmod: 2025-10-23
---

# Is it ever Safe to Write to a Signal in a Derived Computation?

If you have ever talked to people working on reactive systems they will almost always tell you to never do this:

```js
const [count, setCount] = createSignal(0);

const [doubleCount, setDoubleCount] = createSignal(0);

const countAsString = createMemo(() => {
  const c = count();
  setDoubleCount(c);
  return String(c);
})
```

The reason is if something else reads doubleCount first it doesn't realize the change until after. Like pretend we snuck in an effect in between. Or another memo that reads from DoubleCount and is used in an effect first. It would need to run twice on a single update first seeing the old value and then the new. See this [example](https://playground.solidjs.com/anonymous/37425e6f-8ec1-4ad2-b814-afcd8c501052).

The reason is we can't trace back the tree. Honestly it is better than [writing in an effect](https://playground.solidjs.com/anonymous/b6f97f4d-ce98-46a9-8a57-31db2825bb95) as that exposes the torn state. Users see it not just developers.

But the better solution is always to [derive]( https://playground.solidjs.com/anonymous/e524294c-6a9a-4475-ad7c-071bd96352b6).

But sometimes it is inefficient to derive. Especially when we are trying to fork logic. One input, multiple outputs. You can memoize each part:

```js
const [source, setSource] = createSignal({ a: 1, b: 1, c: 1 });

const a = createMemo(() => source().a);
const b = createMemo(() => source().b);
const c = createMemo(() => source().c);

createEffect(a, v => console.log("a", v));
createEffect(b, v => console.log("b", v));
createEffect(c, v => console.log("c", v));

// later
setSource({ a: 1, b: 2, c: 1});

// only b logs
```
See live [example](https://playground.solidjs.com/anonymous/df2436e5-156f-45cb-b6b5-da81807a17c5)

We can clean this one up a bit because the front half of effects are memos.

```js
const [source, setSource] = createSignal({ a: 1, b: 1, c: 1 });

createEffect(() => source().a, v => console.log("a", v));
createEffect(() => source().b, v => console.log("b", v));
createEffect(() => source().c, v => console.log("c", v));

// later
setSource({ a: 1, b: 2, c: 1});

// only b logs
```
But all of the effects queue and run their front halves to determine if the value has changed. Which is wasteful when you know that `b` is the only one that has changed. 

But we can't just make multiple signals if some of these values can depend on each other or we end up with the synchronization problem above.

Or can we?

## Firewalls

Well the first idea I had and the one that we implement internally in Projections is to notify all downstream things that could be impacted, but not queue the effects (ie the things that pull the actual work) until we know they have changed. The trick to this is combining both a special source and independent signals.

You can think of it a bit as if we wrote above like:

```js
const [source, setSource] = createSignal({ a: 1, b: 1, c: 1 });

const [a, setA] = createSignal(source().a);
const [b, setB] = createSignal(source().b);
const [c, setC] = createSignal(source().c);
const firewall = createMemo(() => {
  const value = source();
  setA(value.a);
  setB(value.b);
  setC(value.c);
})
// all track firewall
const getA = () => (firewall(), a());
const getB = () => (firewall(), b());
const getC = () => (firewall(), c());

createEffect(getA, v => console.log("a", v));
createEffect(getB, v => console.log("b", v));
createEffect(getC, v => console.log("c", v));

// later
setSource({ a: 1, b: 2, c: 1});

// only b logs
```
Now the reason this works is because if `a`, `b`, and `c` are only accessed at the same time as the `firewall` then there is no way to read the stale value because it will re-run before you read each if something has gone stale (like updated source). The firewall itself always returns `undefined` so it never invalidates anything itself because its value never changes, but the signals it writes to do.

However this doesn't help us much on its own because the effects are all still tracking `firewall` which does queue all them all. However if we identify the firewall as something special that only notifies memos (things that can be read) and doesn't notify effects, we can defer the work until the firewall actually runs which can be when one of its values are read, or more commonly when we schedule to run the queue.

In so it lives up to it's name in that it contains the notifications at the point it hits the `firewall`. Anything downstream notifies but doesn't queue. And then when it runs in the queue it finishes the queueing based on what actually changed.

I've considered if there is a good way to write this API other than internally in things like projections but there is a bit of a chicken and the egg problem. You need the Signal reference to write to the computation in the firewall, but you need the firewall to augment the signal's accessor. One side needs to be created first and the most ergonomic is the Signal unless you are creating the signals internally in the firewall. Although not all use cases lend to that. Signals inside Projections are created at other times. The guarentee we need to make is only that they aren't accessed any other way without the firewall read.

The whole thing ends up pretty bulky. I think the slimmest option I've come up with is pretty magical and doesn't give people a lot of control, but maybe it is all we need:

```js
const [source, setSource] = createSignal({ a: 1, b: 1, c: 1 });

// internally uses a firewall mechanism on the signals it creates
const [a, b, c] = createRelay((setA, setB, setC) => {
  const value = source();
  setA(value.a);
  setB(value.b);
  setC(value.c);
});

createEffect(a, v => console.log("a", v));
createEffect(b, v => console.log("b", v));
createEffect(c, v => console.log("c", v));

// later
setSource({ a: 1, b: 2, c: 1});

// only triggers effect with `b`
```
This is using the argument count on setters to decide how many internal signals to make and then the read comes out the other side. I guess if we need to pass in options for the signal creations we could do that top level. I honestly don't know if this shape is even helpful but I wanted to write it down because it fulfills the API obligation without being too clunky.

## Safe Writes

Firewalls still carry the overhead of notifying everything which sometimes is unavoidable, but there are a few situations where if you don't care about overnotification you don't actually need the firewalls at all and it is still safe.

We've already identified one case so far in this post: When the signal accessor also depends on the computation that writes to it. If I update our above example to wrap the accessor [we can see this](https://playground.solidjs.com/anonymous/f8b02cc7-d3d7-420a-b477-6a40c2c45d5a):

```js
const [count, setCount] = createSignal(0);

const [doubleCount, setDoubleCount] = createSignal(0);

const countAsString = createMemo(() => {
  const c = count();
  setDoubleCount(c);
  return String(c);
})

// only get doubleCount this way
const getDoubleCount = () => (countAsString(), doubleCount());
```

We get the same results now as when we derived doubleCount. And in this case they both depend on `count` so tracking `countAsString` is not costing us anything really. We track `countAsString` and not `count` since technically there could be other dependencies. There aren't here but you get the idea.

I should mention I generally call this scenario "passthrough" because it can also be accomplished via having the computation return the signal, like if we didn't care about `countAsString` we could:

```js
const [count, setCount] = createSignal(0);

const [doubleCount, setDoubleCount] = createSignal(0);

const wrapper = createMemo(() => {
  const c = count();
  setDoubleCount(c);
  return doubleCount;
});

// access it
wrapper()();
```
Conceptually we are tracking a read on the computation and the internal signal when we read it. This is how Derived Signals(function form of Signals) work too.

As it turns out there is a second situation where it is safe to write in a pure computation. Similar conceptually to the first, but if the signal can only be listened to by children computations of the computation that writes. In Solid we have a `runTop` mechanism that ensures parents do work before children incase they'd release said children. So in a sense this read the source computation is implicit when you are a descendant. 

In this case as long as the signals are introduced and only read below the computation that writes we don't hit a problem. Perfect example of this is in our loop control flows which introduce things like `index` signals. We move the item around in the map function but also set the new index on the signal. Since that `index` is only going to be read below any computation that listens to it will check if the array needs to be recalculated before running.

Why this second case is so powerful is that there is no shared computation reference in notification. These are just raw signals so you end up with full fine-grained performance unlike both read-through memos, or firewalls. It isn't always convenient to model things this way for sure, but it is why we can enjoy performant control flow.

### Helping Developers Identify these Cases

Unfortunately both these situations aren't exactly detectable. The wrapping on passthrough never involves the computation reading the signal. `countAsString` above never reads `doubleCount`. And the same is true of ownership. We can't track who does the writing. Can we restrict this then by how things are read?

Well not really. The passthrough isn't a guarentee. We'd have to somehow augment the Signal accessor to be like only read like so, or error if you read the underlying accessor, but we'd need to get into the Signal's internals. It's the Firewall API problem all over again. And even with that it's really the write we should be guarding.

I don't have a great solution so currently I'm proposing we warn on these writes, but have the ability for the user to silence the warning by setting an option on the Signal like `pureWrites: boolean` or something like that. This definitely feels a bit expert mode but I think it is. I don't think we can package these rules into a reasonable primitive. It is better to be like hey you shouldn't do that. Sort of like destructuring.

## Conclusion

That's about it for now really. I am writing this mostly as note for the future but I understand this is a difficult topic. Hopefully most people will never need to stare it down given the primitives we can provide.