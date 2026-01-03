---
# System prepended metadata

title: What if Marko was Right?
lastmod: 2025-07-23
---

Having gone around the full spectrum of isomorphic solutions it seems everyone has a different opinion. However, it seems that while each have their good points generally people are having a harder time wrapping their heads around the new mental models (even if they are rehashes of old mental models).

Mostly this comes down to people whole like acknowledging the client/server divide and those who want to keep things authored as a single application (and everything in between).

On a spectrum:

Astro - different file types
RSCs - coarse grained directives
Qwik - subcomponent serialization markers ($)
Marko - invisibly automated

To complicate things more there are levels of optimizations that go into it which is largely why Qwik has chosen to spell out every boundary.

## Automation

But lets talk heuristics if we aren't going to care that much about optimization. The simplest approach is determine if a component needs to make it to the client.

The obvious heuristics are look for stateful hooks, side effects, and event handlers. The latter is trivial with the `on____` casing in JSX. The former could be trivial in React with it's `use`, but even in Solid we have an idea if a local variable is used in a stateful way. So we can basically ignore props and look for hooks that are declared in local scope. This will handle both basic stateful hooks and things like context.

The thing that probably makes hook detection hardest is data loading which in itself does not need to be stateful unless it is derived from something stateful. But syntactually this is harder to analyze since it basically looks like a primitive.

This alone might make something like Async Components compelling as we could syntactually differentiate data loading from other primitives. Of course in the client it would compile into the non-blocking form we expect. However, this reminds me that ultimately we need to hoist data fetching. No amount of what we use for patterns. So everything revolves around data patterns.

## Hoisted Data Fetching

### Granularity

I've been trying to decide how much of a lie the need for granularity is. One of the biggest motivators behind Solid's data fetching design is that we need granular fetching and retriggering.

Retriggering actually may not be that hard to figure out since even if the fetching is batched we could still depend on specific fields. Like we could know that only this searchParam triggers this loader. It might require the loader itself to resemble a resource.

```jsx
export config: RouteConfig = {
    data: {
      source: (router) => [router.params.id, router.search.format]
      loader: async ({ source: [id, format], preload }) => {
        `use server`;
        const post = await db.getPosts(id, format)
        return post;
      }
    }
}
```

Unfortunately this doesn't play nice with like Tanstack. However it does allow for reactive invalidation.

> I suspose it doesn't preclude Tanstack if you consider that the source form could be optional. It could support data function like we do today. But it sure wouldn't promote it.

Another interesting property is it could determine client vs server routes. If the loader is purely server function (and this was detectable) could we assume that the route section was as well? Because it isn't the source but the data fetcher that needs to make the decision on what it returns. It could just return the loader data, but it also could return the HTML for the route section.

My hypothesis is if data loading is driven from the route section how much it responds could be determined by the shape of the route.

The biggest tradeoff here is that multi-requests would be entangled. And could use Suspense independently.

### Using Promises?


```jsx
export config: RouteConfig = {
    data: {
      source: (router) => [router.params.id, router.search.format]
      loader: async ({ source: [id, format], preload }) => {
        `use server`;
        return { post: db.getPosts(id, format) }
      }
    }
}

// maybe props
export default PostPage(props) {
  const post = resolve(props.post)
}
```

Hmm... this isn't particualrly great.

The real challenge here is that context only works in the client so distributing data on the server is a pain. The pattern makes that route data effectively just a means for preloading. So cache is the only real solution here if you don't want to deal in disambiguating context.

### Ok so Cache

```jsx
import { fetchPost } from "lib/posts"

export config: RouteConfig = {
    data: {
      source: (router) => [router.params.id, router.search.format]
      preload: ({ source: [id, format] }) => {
          fetchPost(id, format)
      }
    }
}
```

### Nesting

So if we are combining we have to consider nesting perhaps. In Solid's loaders we pass the container down. Now we could do this if our format seperated data from markdown but we don't even know what the child needs.

I think the first question has to be should we just limit this to situations that we know are server all the way down? Or does it even matter.

One key difference between client and server routing patterns is that partial forward navigation works because it has knowledge of previously loaded data above it. We do not.