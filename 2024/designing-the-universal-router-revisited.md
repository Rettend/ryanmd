---
# System prepended metadata

title: Designing the Universal Router Revisited
lastmod: 2024-12-11
---

# Designing the Universal Router Revisited

The router is the center of the frontend universe. It is the the framework. Every major architectural innovation in frontend has been due to a fundamental change in how we view routing.

Islands and Server Component architectures are similar but we risk under representing Server Components if we stop there. What is the key difference between them fundamentally? The client side router. Yes now thanks to View Page Transitions Islands can do client nav easier but state persistence is still a problem for them to solve.

So what is the state of the art for client side routing?

* Nested routes. The ability to subdivide our pages into seperate replaceable sections. This removes wasteful re-rendering of whole page on partial navigation.
* Hoisted data mechanisms. This allows data to be preloaded/loaded independently of the code for the route being present.
* Parallel routes. This allows the routes to split into multiple regions of the page that can be replaced indepedently.
* Lazy loaded components. This saves us from loading code we won't need up front shrinking bundle sizes significantly.

At the heart of these mechanisms are "route sections" these are typically defined by the router and act as containers that hold their own data and code mechanisms. They are governed by the URL. Nothing permeates these containers except for Context applied from parent sections.

So would it be surprising to realize that the current Client Router doesn't need all that much to support Server Components?

## `use server`

The super power of server functions is that they can slide into any existing API. Why shouldn't that apply here too? When I saw Remix's take on RSCs I made a joke I guess my component files would only have "loaders" if I wanted to use RSCs. It didn't sit with my right.

But the model for routing is much simpler and was right in front of us the whole time I think. We don't need `use server` to denote Server Components, but if we did then it still all can work. It takes recognizing that `use server` is for all server functions not just "actions". That is something we did since the beginning in Solid.

## Laying out the Component Architecture

So what if the app started with a client component? Could we still emulate Server Component Architecture.

```js
<Router
  root={props =>
    <Root {...props} />
  }
>
  <Route path="/" component={Home} />
  <Route path="/about" component={About} />
</Router>
```

This is from Solid Router.. but it basicaly denotes a couple routes and a top-level layout.

Now typically `Home` and `About` would be `lazy` components that were code split on the page. And if we wanted to `preload` some data we'd had a `preload` property to their `<Route>` definition.

But what if instead `Root`, `Home`, and `About` were all Server functions.

```js
"use server";
export function Root() {}

export function Home() {}

export function About() {}
```

Now it is true I'm probably missing some sort of wrapper here, something internal to the Router perhaps. But if you consider that the Router is made up of Client Components. That is the `Router`, `Route`, and the internalized `<Outlet>` (accessed through `props.children`) are all client components then it is possible to construct such a tree. Because when the router recognized the change it could in parallel fetch the route sections for the new route and it would stop at any client component (the Outlet) it hit.

While it isn't good to let the client do cascading Server Component requests the Nested Router has the ability to know all the pages it will render and fetch them accordingly.

When the client got the sections back it could use Context in the Outlet to insert the appropriate child responses. Context exists in the client and can easily stitch this together in a way that Nested Context would still work. 

## Initial Render

This one is where things get a bit trickier. The reason Server Components start the process generally is because Client Components can't be rendered after initial render. Now for this to work Client Components actually have to kick off the process of SSR. Which means it is more like Client Render -> Server Render -> Client Render. Luckily while waterfall-like a unified process could handle this. THere are no guarenteed data waterfalls here, you just need permissiveness to go between Client and Server and back again.

Like Solid's Hybrid Islands approach did render client components all in one go during initial SSR. I feel like this is something if desired could be handled. Similarly in Solid Start hitting a Server Function on the server is just hitting an Async function. So having these componenents this way doesn't seem prohibitive.

## The Gain

The coolest thing about this approach is that it takes very little to change the router to support this. The same Router paradigm still works fine. You could have certain page sections be "use server" and others that aren't. Because each is isolated it doesn't even matter for stitching them together. It doesn't negate the power of the `preload` function all the parts just work together based on what you opt into. It is a universal mechanism where just happens that some of the render tree happens on the server as opt in.

If there is no `use server` then the router doesn't need to go to the server at all (assuming JS is loaded). Basically nothing changes from today and this is purely additive behavior.

## The Tradeoff

Server functions work off a different graph than the compiled server code. So references are an interesting problem. If one were to want to cache the results a simple in memory cache might not work because it might not be the same process. It might require some smarter caching system. I'm pretty sure React team is on this wavelength hence "use cache". This actually feels like why it exists. It's why I'd create it if I were them.

## Conclusion

While honestly this doesn't sway me to focus on Server Components because I'm less interested in prioritizing at the moment UIs whose primary content changes less often. The fact that this could bridge the gap is very compelling. More so, that the router doesn't require too much specific consideration to support this. This means things that may have caused us to be cautious with advanced routing considerations like Parallel Routes or even some of the Typed stuff Tanner is doing is less of a concern.

If we wish to explore Server Components eventually we can still keep just doing what we are doing. And that is the real gift because now I feel confident putting them aside for the moment to focus on what I feel are more immediately beneficial things and know that we are still in the clear for the future.