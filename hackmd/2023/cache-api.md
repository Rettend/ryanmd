---
# System prepended metadata

title: Cache API
lastmod: 2023-07-18
---

The question is there enough here to alleviate the tension on createResource.

This falls into the following concerns:

1. Prevent Refetch on Hydration
2. Cache Over the Wire Serialization (Partial Hydration/Streaming)
3. Per Request on the Server
4. Cache Invalidation
5. Deferring the Stream
6. Support Tanstack

Roughly proposed API is:
```jsx
// lib
const getPost = cache((id) => fetchPost(id), { expires: 3000 })

// route preloader:
function preloadRoute(params) {
  getPost(params.id);
}

// in your component somewhere
const post = createAsync(() => getPost(props.id))

// maybe also support
const post = createAsync(getPosts())
```

## 1. Prevent Refetch on Hydration

If the cache generated a uniqueID and knew it would be populated it could just skip running the function and returning what is in the cache. So even if the reactive stuff ran it wouldn't generate a new promise.

But how to get a uniqueID? There is no structural consideration.. ie no hierarchical ID. There are arguments but there is no identity for the function itself. Would we need a cache key?

```js
const getPost = cache((id) => fetchPost(id), { name: "post" })
```

With this though we would have an entry `[["post", id], value]`. And it would be found on both sides assuming we serialized promises.

## 2. Cache Over The Wire Serialization

Like today we could send the cached data across as it finishes. There is an interesting behavior where we don't send resources when created under non-hydrating context. Should read still be the ultimate determination whether cache is sent. Can we tell if it is actually used?

Well I guess we can just look at where the fetch happens and if it is fetched under no hydrate it is the same idea. We only bother serializing if the fetch happens in a hydrating context. It only takes it be fetched once under a hydration context for it to be included. It doesn't even need to resolve as we need to flush that we are waiting for it.

We do need to serialize in this case before we flush because the client may try to hydrate and it needs to know there is something in the cache otherwise it will fetch itself.

## 3. Caching per request on the server

AsyncLocalStorage is the trick here. While we can initialize the cache the actual context will be read off AsyncLocalStorage at the time of function call. Not sure there is much else to it. In the client we will use a global cache and not need to worry about this. To be fair we could probably jam this on `sharedConfig.context` if we really wanted to on server but I don't think it is the right solve ultimately given Promise chains we can't intercept.

## 4. Cache Invalidation (Client Only Concern)

We could put expiry options on the `cache` function. But refetching also comes to mind. That being said without it being reactive itself refetching makes no sense. Unless the cache exposed something directly that `createAsync` could tie into. But that'd have to be on the returned promise. And well hmm.. 

Hypothetically let's say that we added `.value` on to promises that we used. This way they could be resolved synchronously after the fact (beneficial to reactivity). Could we also look for a hidden Signal that would retrigger `createAsync` if present. And it would be something that promises from our `cache` APIs could return. Then if someone calls:

```js
refetchCache("post")
```

It could also trigger any `createAsync` to run again. Something like that. I guess it should be wrapped in a `transition`.

How does this play with Server Components? The cache never makes it to the client so maybe it doesn't matter. Maybe not naming it is enough to suggest that. But I picture someone trying to invalidate something that isn't there. Maybe it doesn't matter.

## 5. Deferring the Stream

No Top Level Suspense? It is an interesting idea I've seen posed. Of course that only works easily with Server Components. Otherwise in a client scenario you just get no Suspense which basically works like Suspense without a Fallback. I mean I suppose it could just show torn state but it doesn't seem quite right.

It's possible that we just control this from Suspense boundaries instead of at a Resource level though. Basically we don't flush if any current Suspense says, wait til completion to flush. Since we do synchronous execution first we know. I have to admit I think I still like this better per resource level, but augmenting the cache might feel odd.

## 6. 3rd Party Libraries (Tanstack)

They'd have to use or atleast mirror our cache.. which is probably odd to say the least. It wouldn't be hard to ape the APIs as long as the solution had invalidation but then it wouldn't be those libraries. I suppose they might be content with just having the right invalidation rules. Like if they could tap into it. We have to consider though that this would require a rewrite for those sort of libraries.

We could probably wrap this in the current createResource API by using hydration key as the cache key.