---
# System prepended metadata

title: Can Push-Based Delete createAsync?
lastmod: 2025-07-24
---

# Can Push-Based Delete `createAsync`?

I did a quick look and said probably but I think I need to look at the consequences in more detail.

On the positive I can pretty confidently say the answer is "yes" for typical client side development. We just need an Eager Memo and Promises and if all Memo's are eager then we just need Promises. Making it work for Signals is a bit more of an ask especially considering Stores. So that requires some thought.

However, for SSR and Hydration it might be a bit trickier.

## Why Care?

There is some value in removing another layer if a lot of logic is going to go into cache layers anyway. Things like Solid Router's Query or Tanstack Query. It would be great if we didn't need a `createAsyncStore` etc... Not that we ever needed it, but without it requires training people of diffing pretty quick. There is also the fact that if we can expose async at a more primitive level it might make it less cumbersome to make some of the more complicated patterns.

What if you could just:
```js
const fetchPost = query((id: number) => {
  "use server";
  return db.getPostById(id);
})

function Comp(props) {
  const post = createMemo(() => fetchPost(props.id));
}
```
This isn't any different than `createAsync`. I suppose if we wanted to get more of the `createResource` API back you could:

```js
const [post, setPost] = createSignal(() => fetchPost(props.id));
```
Of course once you set the post it would be a different post than that from the server and you'd need the source to update again to replace it.

I don't know if this aids with a natural upgrade path. I'm thinking the base demo generally creates a Signal and then when it decides to replace that data from the server it swaps to `createAsync`. But realistically the basic demo should probably start with `createMemo`. I guess `memo`'s  name is unfortunate because it is so primary here.

What I mean is if you had a demo without Async you might:

```js
function Comp() {
  return <For each={TODOS}>{
    todo => <Todo todo={todo} />
  }</For>
}
```
So the question is could you change this to:
```js
function Comp() {
  return <For each={fetchTodos()}>{
    todo => <Todo todo={todo} />
  }</For>
}
```
And the short answer is probably no because `each` doesn't know how to handle a promise. I mean it could but then you'd be building that into your control flow.

Like something like this could work in some situations like inserts in the general case we aren't setup to deal with promises.

## `waitFor`

I mean you could take a page from React:
```js
function Comp() {
  return <For each={use(fetchTodos())}>{
    todo => <Todo todo={todo} />
  }</For>
}
```
This could work as it could basically inline memo the promise. Of course `use` couldn't be responsible for serialization I imagine because you could use things all over the place. So maybe this sort of system would only work with explicit serialization. It's also possible you'd always serialize what you `use`. This whole mechanism would allow Signals/Memos to still hold promises.

Also this is different from React because it is basically a Signal read function it needs to be under a tracking scope. So `use` is a poor name. It is more like `waitFor`.

```ts
function waitFor(in: Promise<T>): T {};
```


In either case I feel the bloat comes back:

```js
function Comp(props) {
  const post = createMemo(() => waitFor(fetchPost(props.id)));
}
```

I mean that is just what `createAsync` is. `waitFor` on the return value.

On the positive it would basically track any Promise in any reactive scope. And if you were clever you'd bake the `waitFor` into the `query` helper.

Although looking at this another way is `waitFor` is just `await`. Something a compiler could add. However `await` only goes in async functions which has a lot of awkwardness. Like you can't put await in our compiled JSX without making the component async (parser and TS would have a fit).

`waitFor` is it suggests that all async fetching is under a tracking scope. Like you couldn't set a Signal with a `waitFor`. Which does again ask why making it a seperate API. It is cool that you could just put it wherever (it is tracking). Then again you'd probably want to push this up as high as possible anyway. So this is really only the win for the upgrade sync to async demo case and it is hardly a win.

## SSR

So let's put aside use cases for a moment. And look at SSR mechanics. On the base eager vs lazy doesn't make a huge difference with SSR because things generally run once, and things that are used general do so right away.

There is one exception chained async. Like:

```js
const user = createAsync(() => getUser(props.id));

const posts = createAsync(() => getPosts(user().referenceNo));
```

Obviously this is waterfalling but sometimes there are data dependencies like this it's better to hoist them together but lets say they aren't. In this case the fetching for `posts` is going to fail when it reads the `user` that isn't there yet. Which is fine it's like async read and propagates it to where to is finally inserted.

However, currently we know because we are dealing with createAsync that when the other fetch completes to run. In fact we hook onto the promise and chain the promise with rerunning the dependent call. That is one difference I've made between client and server.. We attach the promise to the NotReadyError. This way things that collect can know when to pull again.

In this case we actually use this mechanism to eagerly fetch. It does pull too but we aren't dependendent on the pull to actually grab the `posts`.

Again this is a solve for a variation of the diamond problem. Consider an Async B, and C, that depend on Async A and then they are read sequentially in render effect D.

>   A
>  / \
> B   C
>  \ /
>   D

If we were waiting on pull C wouldn't be fetched until after D B finished. Whereas being proactive means they fetch in parallel.

However without `createAsync` how do we know to chain the promise. Just because a source is not ready doesn't mean we need to be waited on. Basically if we were to apply this logic to every memo, we'd create a cascading set of promises for every memo. Now to be fair we could always keep the source promise the same so it could not cascade as much as just be a single level. Every downstream tries to re-run based on the initial promise. But that is potentially a lot more Promises than what needs to happen. Especially if chaining isn't that common in the first place.

I guess the simple way to look at this is if the server is pull-based we still need to make async eager and this is the mechanism. So the exact same reasons I had `createAsync` in the client is now why it needs to remain for the server.

We could always wait for the dependent to manifest a promise to actually decide to serialize or not and since every node gets a hierarchical `id` already based on structure not execution time I don't think hydration cares either way. So this comes down completely to server rendering.

Is there an alternative? Well it basically becomes push pull. If we kept deps on the source we could call those and they could call theirs and eventually we just pull out the values but it's a lot more machinery. Only push or only pull is much simpler than anything in between.

## Conclusion

It seems we should stay with `createAsync` maybe? I'm not sure if there are any other implications I'm missing. I think `waitFor` is too cute and would probably get people in trouble. Of course this doesn't alleviate the need perhaps for`createAsyncStore`. But maybe internalizing the store in `query` is still the way to go regardless. I'm pretty sure Tanstack Query does that.