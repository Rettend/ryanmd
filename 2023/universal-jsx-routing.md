---
# System prepended metadata

title: Universal JSX Routing
lastmod: 2023-03-16
---

# Universal JSX Routing

This collects my thoughts on how we could universalize routing for both Server Component and Client only architectures under the same API.

## Pre-Requisite Knowledge

### Client Side Routing: State of the Art

Current brand of Nested Routing really became a thing in JavaScript with Ember Router introduced back in ~2012. Almost all other routing experiences have extended from that. Over time patterns have changed but the fundamental path based mapping and scoring started here.

First moves were to add blocking/data loading/lazy mechanisms at the route sections. However the early work here produced waterfalls and no easy way to share data between sections.

Later on there were efforts (earliest I think was Sapper or Nuxt) to parallelize the data fetching. This was the approach taken with Solid's Router in 2020 and Remix's. However, given that Solid had Suspense by this point we relied on a non blocking pattern based on signals. Ie.. move the blocking to the components so we could localize loading states.

### Understanding Loaders

The common piece of these is that each route section has a denoted data loader. This is set place to start fetching, and can be hoisted and parallelized. By enforcing a seperation from presentation components it gives a set lazy load boundary, avoids waterfalls by its very nature, and removes a lot of boilerplate that you would inevitably do every time you create a route.

The biggest challenge with Loaders has been how to inject the data back into the tree. Between loaders themselves, you can set conventions with merging non-conflicting keys, you can keep them independent, you can pass the parent data into the child.

Into the tree you can use Props. But that means other means to avoid prop drilling. You can use context, but that decouples TypeScript from the loaders and the router unless the types come from the loader itself. Which can be challenging prospect at times because the need to code split. You can just import the types or use compilation to have it co-located, but it is a consideration.

The APIs can vary here even. I've worked through everything from always passing objects with keys, to passing in a JSX element that receives the props.


### What would No Loaders Look Like?

This has always been an option and was the only option for many years in certain ecosystems(like React Router v4-v5). But I mean what if we wanted to do this without the down sides. 

Fundamentally if your router only had a component you'd still want to do all the data fetching up top as this would allow you to code split the most code. So the user would be responsible for making the `lazy` wrapper. Much in the same way Server Components wrap `client` components.

```jsx
const LazyHome = lazy(() => import("./ActualHome"));

function HomePage() {
  // grab the route data could also be props perhaps
  const location = useLocation(); 
  const params = useParams();

  const data = fetchSomeData();

  // code split here
  return <LazyHome data={data} />
}
```

You can see the parallels here with:
```jsx
const ClientHome = client(() => import("./ActualHome"))
```
Ergonomics aside as I'm sure things like Bling$ could help you basically always end up with the loader pattern anyway. Except you are wiring it. That being said with Server Components you are always wiring it anyway, so like who cares, maybe?

Another consideration is Suspense. Does each need to be it's own Suspense boundary. This boundary needs to happen above the lazy as well (or the first read), but not necessarily above the data fetching. It could be above the whole router itself but for Server Components I wonder if that is prohibitive.

## Bridging the Gap (~March 2023)

Server Components have led to a lot of simplification, return to basic thinking. It is pretty obvious with mechanisms like Suspense how we could make this all work on the Server.

I think avoid waterfalls are still important wherever you are in the process so inevitably you will recreate the loader pattern. Undeniably but we need to think about boundaries here and maybe there is a possibility to overload them in such a way that this is the preferred DX.

More over because client components don't re-render on the server to pass data through server components we need a new construct that isn't Context. This is why React has been looking at cache APIs. It both solves parallelization and access. However to avoid waterfalls you still need to hoist.

### Parallelization

The router would need to start running each nested section with no expectation that the `<Outlet />` is present when it gets to it. That would need to be inserted after when all is resolved. In so as long as no expectation of Context between router sections the rendering could be completely parallelized.

This brings an interesting question because all cross container context would need to exist above the router. However, in a Server Components world you might not be rendering all the sections. So the router would need to be aware of which sections to render. And in a sense even be above the `<html>` tag if it wished to skip rendering top level section on each request. It means it would need the routes. While Nested Routes are fine, Nested Routers don't really make sense in this model.

```jsx
<Providers>
  <Router
    routes={
      <>
        <Route href="/" />
        <Route href="/users" />
      <>
    }
  >
    <html>
      <head></head>
      <body>
        <A href="/">Home</A>
        <A href="/users">Users</A>
        <Outlet />
      </body>
    </html>
  </Router>
</Providers>
```

Basically the router could skip the top level layout on an after the fact Server Component request. And manage how it renders the Routes itself. Ie run each section separately.

It is interesting if we could maybe move the Providers inside of the Router as they are client only.

```jsx
<Router
  routes={
    <>
      <Route href="/" />
      <Route href="/users" />
    <>
  }
>
  <html>
    <head></head>
    <body>
      <A href="/">Home</A>
      <A href="/users">Users</A>
      <Providers>
        <Outlet />
      </Providers>
    </body>
  </html>
</Router>
``` 
I haven't included Suspense or Error Boundaries in this example but I think they can go where they make sense. Likely around where the Providers are or maybe around the whole Router to ship an alternative error page with correct headers etc...

There is one pitfall I see here in that for server components you need to consider what happens above the top most router outlet. You can only swap up to that level. So while it might seem fine to define some nav stuff outside, it might not actually be able to live outside. And in that case either things don't update or you are forced to full reload the page. I think this is a tension for design.

You almost want to make it very clear the things that are never going to be able to update at an API level. Honestly I'm not sure if exposing the document is actually a good thing. 

### Streaming

Streaming is much harder when they aren't nested.Because while Suspense boundaries will global or local, we still need to insert one in the other. It is possible that parallelization may not be as important anyway as isolation of parts since when we are waiting on async we are basically deferring anyway. And compared to the complexity for streaming it probably isn't worth it.


## Re-examining the JSX entry (July 2023)

When we build a SC app we end up with a static root that never updates (`<html>`), a dynamic root that could update with navigation, and then each route section.

Funny enough the contents of the static root do get updated but programmatically as we never re-render the whole document. What does this suggest API-wise?

Universally stuff outside of the `<body>` never was part of our app in CSR. So why should it be now? Well for SSR it was attractive to do it in one component/file. But we don't really get this anyway with SCs.

Now if things that write dynamically to the head are registered as part of the router then a lot of this need goes away. You would just start your app the CSR way. 

However for this to all work we actually Router still needs come consideration as we'd want to be able to diff at the mount point.

And probably not bother with remaking global context providers on the client on most actions. Furthermore we wouldn't want to do stuff like code splitting on Root even if it is treated as an outlet of sorts. Not a problem for SCs but a problem for other modes.

```jsx
function App() {
  return <Router
    routes={<FileRoutes />}
    entry={outlet => (
     <Providers>
       <Nav />
       {outlet()}
     </Providers>
    )}
  />
}
```

What do the route defintions look like well they have a preload function:
```jsx
<Route path="/" preload={}>
</Route>
```
Why a preload function.. to warm the cache. It does nothing else. Then we createResources where we use them. We don't have context.
