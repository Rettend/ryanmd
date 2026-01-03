---
# System prepended metadata

title: Advanced Caching with Router APIs
lastmod: 2025-07-23
---

# Advanced Caching with Router APIs

It goes without saying I think we need to rename the `cache` function. It is a cache but it confuses everyone. I think I might just call it `query`. I was opposed originally but I think it aligns now more if we take into consideration more advanced use cases. `data` is also an option but I will use `query` for the rest of this exploration.

The gist of the problem is people will want to manage their caches themselves. We took the most minimal approach but it would be interesting to explore what more advanced approaches could look like.

At this point while I know `createAsync` is a core API it is harder to determine if `query` and `action` are. I think not. Do they belong with the router? Because of their route awareness I think they have to. But during the course of this exploration we should consider implications of that decision.

## Following the Shape

To begin the shape of our API informs a lot. Wrapper functions only are accessible from the client or during server rendering. This means that while a cache wrapper can be possible for server rendering it could only ever apply to server component rendering, which makes it less than suitable as a dependable server side cache. If you need that wrap your DB calls.

There might be a future where we want to support Server Components so keeping that in mind but we can't just say.. that's how it works. It would create wrong expectations since server functions "miss".

So for this reason I think we are only interested in client caches. If you want to cache fetch on the server/db for longer than the request.. that's on you. 

## Wrappers

The challenge comes in that we want to handle serialization and restoration of state from hydration. Right now createResource serializes and `query` serializes. Since presumably they serialize the same thing there is no duplication but that is the trick.

```jsx!
const user = createAsync(() +> { // this serializes
  return fetchUser() // also serializes
})  

```

Our custom cache does not need to handle the serialization itself but only be concerned with the lifecycle.

But where does it sit...

### Outside?

```jsx
const foreverCache = {}
function foreverCache(myQuery) {
  return (...args) =>
   // I can use the passed in query function to figure out the key
   const key = myQuery.keyFor(...args);
   if (key in foreverCache) return foreverCache[key];
   return foreverCache[key] = myQuery(...args);
}

const myForeverQuery = foreverCache(query(
  () => fetchUser(), "user"
));
```
Does this work with hydration? It should because it will miss on first fetch after hydration but the query will have the serialized value.

How does this work with revalidation?

Being on the outside it's possible to starve the signal read internals of `myQuery` above so a cached value might never register the signal on a newly navigated route and then never retrigger. Basically if we want revalidation to work we can't be outside.

### Inside?

```jsx
const foreverCache = {}
function foreverCache(fn) {
  return (...args) =>
   // How do I get the key now? Do it myself..
   // Maybe the router exports some utilities?
   // Atleast the fn.name will be stable
   const key = fn.name + getKey(...args)
   if (key in foreverCache) return foreverCache[key];
   return foreverCache[key] = fn(...args);
}

const myForeverQuery = query(foreverCache(
  () => fetchUser();
), "user");
```

So this solves our revalidation. It's only on a `query` miss that we need to hit our cache at all. So we can revalidate how we see fit. It is true that without knowing about each other you'd have to have it revalidate both.. Maybe previde your own revalidate function, and maybe wrap the whole thing in a helper:

```jsx
function foreverCache(fn) {
  return query(internalForeverCache(fn))
}
```

How do we manage Hydration though... like above it won't run at hydration time but at the first query change/revalidation. Unfortunately, being inside it doesn't have access to the serialized value. So the serialized data from the server has no way of prefilling this cache.

It's also worth noting that server functions can return advanced values that I'm unclear if the cache could serialize. Things like responses. Being on the outside meant you only got resolve things.

So wrappers maybe aren't a good solution.

## Exposed Options

```jsx
const myForeverQuery = query(() => fetchUser(), {
  key: "user",
  cache: myForeverCache
})
```

I don't want to make advanced cache features. I'd rather the client cache be pluggable. So how do we fix the wrappers above? We make it on the inside but solve hydration.

So what interface do we need?

### Pass your own Storage

Well, it's tricky if our cache doesn't want to be inside or outside. It needs to be sort of both. It doesn't get the return of the fetch function directly so we can only interface by asking for keys and setting keys. This assumes that it participates in our revalidation.

There is also a question of when to purposefully miss. Our current backcache mechanism only hits during browser based (forward/back button) navigation. So you'd need to know intent.

There is also the consideration around the potential async nature of the storage. I think the `get` would need to be potentially async. So roughly I'm thinking.

```js
{
  async get(key, intent) {}
  set(key, value) {}
}
```

So our forever cache that is just a never auto expiring cache would be:
```js
function ForeverCache() {
  const foreverCache = {}

  return {
    get (key, intent) {
      return foreverCache[key];
    },
    set (key, value) {
      foreverCache[key] = value;
    }
  }
}

const myForeverCache = new ForeverCache();

const myForeverQuery = query(() => fetchUser(), {
  key: "user",
  cache: myForeverCache
})
```

The tradeoff of `get` being async is that once this option is present there is potential to even know if the key is present requires awaiting a value. Like if you are using some like in browser db you can't really ask `has` synchronously either. (Please correct me if I'm wrong).

### Implement our own SWR mechanism

In another words have options like `expire`, `stale`. We assume that the cache is only the length of the current page session (goes away on reload) and we build in an SWR mechanism. Behaviors like backcache vs always would need to be configurable. It's possible in all cases we should just have a disable backcache mechanism.

## Conclusion

Still seems messy. The fact you can't easily do this myself does trouble me some. When I created `createResource` I was really concerned about how something like Solid Query would extend it. I think `createAsync` is more flexible in that manner although it might still need an `onHydrate` hook in. But I do see through this exercise that purely HoC based approach to caches don't really work well. Like you can have one wrapper but composing them is a mess.

Also none of this solves server side cache. While writing this post the last couple days I saw the recent `"use cache"` for Next which naturally alleviates that problem I think. It's an interesting dimension to things probably also worth exploring. In our case only for our `"use server"` functions but interesting none the less.


