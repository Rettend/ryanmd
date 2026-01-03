---
# System prepended metadata

title: Cache & Async
lastmod: 2023-09-14
---

# Async

The premise is that without context on the server, and honestly data fetching doesn't really belong as global state, we should be looking at non-reactive mechanism that can feed into a reactive system.

## 1. `createAsync`

We need a simple Promise to Signal convertor. We can't just use a Signal or Memo because we need it to evaluate eagerly to prevent diamond problem with async, and we need it to be a factory function to allow Suspense re-render during SSR not to friviously create promises before we can get to them.

It looks a lot like `createMemo`:

```jsx
const user = createAsync(() => fetchUsers(), initialValue, options);
```

Biggest difference here is I do not want to pass previous value through I believe as this method will often be used for server functions. And it allows for the no argument shorthand:
```jsx
const user = createAsync(fetchUsers);
```

There are several things missing here from `createResource`. 

1. There is no state, no loading/error etc.. this will be reflected in the internal read state of the async primitive and managed by `<ErrorBoundaries />` and `<Suspense />`. There will be loading/error reading APIs outside of JSX as well but it won't be a special part of Async's interface.

2. There is no source. The function is reactively tracked. 

3. There is no `mutate` or `refetch`. This primitive is only about resolving promises. If you want to refetch have a refetching Signal. If you want to mutate use `createWritable`.

> We may need `createWritable` to understand that a `set` after initial promise creation, and before promise resolution won't propagate but this is the mechanism.

```jsx
const user = createAsync(() => fetchUser(props.id));
const [userName, setUserName] = createWritable(() => user().name)
```

4. `createAsync` will guarentee the value as it throws (and propagates through reactive reads). The example above will not error even those `user` is initially undefined.

### Understanding Tradeoffs vs Resource API shape

Resources handle many things today that could be broken up. Some are still desireable and some less so.

1. Keep track of state of the promise reactively - Drop in favor of Suspense/ErrorBoundary

2. Mutation(refectch APIs) - These make it hard to extend. Ideally something on top adds mutable temporary projections like `createWritable`.

3. Suspense Triggering - still needed

4. SSR render flow - still needed

5. Hydration serialization - could be offloaded, although suggests another core primitive.

Resource very intentionally keeps the tracking side seperate from the fetching side. There are few pros/cons that come with this.

Pros:

* There is on confusion around only tracking before the first await. Reactive systems are synchronous and can't resume context after an await.
* Caching mechanism for hydration can be built into the primitive since the front half can execute independently from the backhalf. 

Cons:

* Those who wish to insert custom cache mechanisms need to wrap the whole thing as wrapping the fetcher can't cause reactive re-triggering.
* Similarly `refetch` tends to be a thing in the basic case as it pushes you away from using reactivity.
* It requires a specific API shape. There is a world where `createAsync` is just `createMemo`

### SSR

Solid Server rendering does re-render so `createAsync` does need to keep track of its promises from previous runs (we do that today in resources). The challenge is with no reactivity on the server how do we account for changing props if we cache the promise (ie. what if props.id changes). 

```jsx
const user = createAsync(async () => await fetchUser(props.id));
```
Well it shouldn't unless that `props.id` is dependent on something else async. Which means if it isn't ready, it will throw before this ever creates its promise. In so on the next run it will not have a saved promise and try again. Only succeeding when all async sources are present.

This removes the need for having the double function approach (seperate source and fetcher) `createResource` has today on the server. It also suggests that we should only support a function factory form and not taking a promise directly as we don't want to encourage promise creation top level. A `cache` API could guard this on re-render, but most people don't think of Solid as a re-render mental model so it would be unexpected to require it all of a sudden just for SSR.

### Hydration

`createAsync` would still serialize for Hydration but it would not be responsible for restoring the cache on bootup. Any cache API would need to call Solid's serializer itself during SSR and given that we dedupe both will end up with the right value in the browser.

## 2. `cache`

I'm thinking of this more as a interface than an implementation. I always stayed away from caching because it is too opinionated. What if we focused on decorating a promise like interface.

```ts
interface Cacheable<T> extends Promise<T> {
  value?: T;
}
```

This is mostly for synchronous access after completion but there is a sneaky backdoor this allows for invalidation.

`.value` can be a signal access. If `createAsync` internals check against `.value` we backdoor into creating a subscription.

Although this only works with direct consumption. Were it wrapped in another promise, say an Async function it wouldn't work.

### Possible implementation

At its core it is a memoization function:
```jsx
const fetchUser = cache((id) => fetch(`/api/users/${id}`));

// use it like
fetchUser(2);
fetchUser(2); // returns the same promise
fetchUser(3);
```
If provided the same id twice it will return the result of the first run. This also suggests arguments to a cacheable function should be serializable, otherwise they might not be stable.

However there are some more interesting details.

#### SSR

The cache will only live the lifetime of each `Request`. It may be interesting to feed this into the session alternatively as the same mechanism for client caching could apply there but that is not initial scope.

It's primary purpose is to dedupe data fetching. Simply wrap the source JS API, and then import it where you do preloading, and where you need to use it.

Solid's SSR method is multi-pass right now so it is important that the cached promises add the ability to be read syncronously as to not trigger Suspense again when ready. We can do this by writing a `value` property on the wrapped promise.


#### In the Browser

`cache` could be used with a maxAge and invalidation keys here.

```jsx
const fetchUser = cache((id) => {
    return fetch(`/api/users/${id}`)
  }, {
  maxAge: 5000,
  key(id) {
    return ["user", id];
  }
});
```
The key would be a function that allows custom key based on the arguments being passed in.

We alternatively could just use a name field and sort of auto concat in the background. This is less powerful but is a bit shorter:

```jsx
const fetchUser = cache((id) => {
    fetch(`/api/users/${id}`)
  }, {
  maxAge: 5000,
  name: "user"
});
```

This is mostly concerned with invalidation, but alone doesn't handle retriggering reactivity.

#### Retriggering Reactivity

Would require the cache read to be tracked, and the write to trigger. 

## Appendix A: Persistence Layers

|Type|Location|Lifetime|Invalidates|Used By|Personalized|
|-|-|-|-|-|-|
|Preload Cache|JS Code|short timeout|N/A|Both|Yes|
|Application Cache|JS Code|Page|manually/by key|Client Components|Yes|
|Hydration Cache|Script tag in HTML|Hydration|on consumpution|Client Components|Yes|
|Client Storage|`localStorage`|Client Device|overwritten|Client Components|Yes|
|Browser Cache|Browser Cache|FIFO|URL/Cache Headers|Both|Yes|
|Network Cache|CDN|Indefinite|URL/Cache Headers|Both|No|
|Request Cache|Request Event|Request|N/A|Both|Yes|
|Session Cache|Persistent Session/Redis|FIFO/Timeout|manually|Both|Yes|
|Database|Lots of options|Indefinite|overwritten|Both|No|