---
# System prepended metadata

title: Server First Framework
lastmod: 2023-01-19
---

# Server First Framework

This documents the idea of what a server first framework would look like 2023. I think while we have learned a lot from the last decade of SPAs we are carrying too much baggage. Designing our server oriented framework with too many isomorphic tendencies.

Keep in mind this will mix and match syntax and is less a proposal but a general guideline as to how one could implement this using a variety of tools.

## I. Overview

### A. Flow

#### 1. Initial Render

The initial page render is very similar to what you would find in an Islands framework. All components are server rendered and sent to the browser. Client component props are serialized and any resources initiated inside client components.

Client component are collected and hydrated (as available, if streaming). 

#### 2. Navigation

For subsequent navigations the router requests to the server with the next URL(including the current URL). The server is able to process that to determine which route sections need to be rendered. In parallel the client requests any Islands required for the next URL to load the code.

The server renders only the new route sections skipping rendering the client components but still serializing the props. The client receives the response and is able to swap the route outlet with the new HTML diffing and applying props to any existing components that are preserved. Otherwise it just renders them in the client.

#### 3. Mutation

At the core, mutation follows the pattern of MPA. You send data and the server responds with the new Markup representing that change. You can think of it like a form post. The request responds with the next page so, it means handlers will likely use a redirect/invalidate return syntax even though it will all be handled server side as part of the same server response.

Given the client page doesn't unload this needs to be facilitated by API request of some sort. RPC are preferred as to not tie mutations to a single route. Like GraphQL we split our Query from our Mutation.

--------------
### B. Authoring

#### 1. Importing Components

Server-only components may contain client components and other server components. Client components may not contain server components, or rather if it were allowed those components would become client components. This is important as to prevent waterfalls. A server component tree should be contiguous. Otherwise a change that causes server component update could cause a prop change on a client island which could in turn drive a client island to update props on a server component, causing fetch.

#### 2. Route Sections

Pages are to be seen as  is a tree of possibly shared layouts each acting as their own top level entry. These top level entries will be considered server only components but may contain client islands.

It will be customary to do your data fetching near the top of each of these, although it isn't a requirement. The data should be awaited where it is used, and those points should be wrapped in some sort of placeholder/boundary to support out of order streaming. Each section will act independently so some sort of cache layer is probably mandatory if the same data would be used in multiple sections.

## II. Considerations

### A. Templating

#### 1. SFC

JavaScript as a templating language is fine, but Single File Component style is preferable probably for server first authoring:

* Start with HTML(JSX)
* Easier to optimize if arbitrary JSX can't be inserted (buffer writes instead of returning arrays)
* Stateful mechanisms that lead to code organization splitting aren't present
* Clear separation between client and server without cannabalizing current ecosystem

Top-Level Await seems like a benefit here but actually is awkward since you want to have your Placeholder above. This would lead to 2 components(files) at minimum. This is probably a motivator for why Next 13 router is multi-file.

If we want to just author as we go we need to move the await into the template. This adds a whole other dimension though. 

#### 2. MFC

This is natural pattern for the composition. Challenge is how to make this pattern different enough for authoring to distinguish between server and client components.

Server components don't necessarily need to have hard rules but they don't benefit from a lot of the complexities we've added over the years to the client side.

Technically the only hard restriction for why a client component couldn't be a server component is reading from Context. But the implications are much more severe if you want to enforce that isolation. Is its ability to be a client component part of its identity (must always be), or is it a decoration.

Ie..
```jsx
"use client";

function ClientComponent() {}

// or

function Component() {}

const ClientComponent = client$(Component)
```

#### 3. Primitives

However, in addition to syntax we should be focused on language based semantics. There might need to be some built in components from a compilation standpoint if we want the best possible experience. The challenge is we don't want too many of these.

* Analyzable Loops
* Suspense/Placeholder Boundary
* Error Boundary
* Async Read

--------------

### B. Routing

The goal here is to use Nested Hybrid routing and suffer nothing from it.

This involves a few key optimizations that make or break the approach.

#### 1. Load vs Refresh Semantics

Every segment of a route can either be in a state of new navigation, or being refreshed. The difference is a new navigation is a replace operation conceptually, and a refresh is a diff.

On any navigation we replace only the portion that is new. On any parameter change we refresh any portion below that fragment. And on mutation we refresh the whole page. 

#### 2. Don't render Islands on Server after Initial Page Load

One interesting optimization is that on refresh since we preserve Islands we don't need to render them again on the server. And more so to preserve client context we shouldn't render them on the server after the fact since we won't have access to it there.

The most interesting consequence is if something were all Islands we'd only need serialize the props, essentially devolving into a JSON API.

However, to avoid waterfalls we need to know on the client which Islands to fetch for each route still otherwise we are waiting for the response to fetch the code to client render.

#### 3. Render Only Required Sections

As we do with client nested routing, we should only render the new sections on navigation.

The consequence is all route data needs to be independent. This means fetch duplicate data in each secion and rely on server cache. (Alternative if data is hoisted could just fetch it all always).

Similarly Server Context is a problem here. It doesn't live between requests, so the only way to get it back to the server for the next request (since we aren't re-running the whole page) would be send to the client and back again.

#### 4. Partial Parallelization

Ideally we can render each nested segment independently. And if that is true we should be able to parallelize rendering of each portion. Whether it is actually parallelized process or just a matter of non-cascading we could treat it as such.

However, this presents a challenge for things like context. Parallelizing the data fetching is something we already do by hoisting route data loaders, but things like context aren't so special and we don't learn about them until we render. However, we could reserve this parallization only to after intitial render.

--------------

### C. Async Orchestration

We've been relying a lot on Suspense's inversion of control. It has this nice benefit that we can collect async things and defer running side effects until things have settled. This has had a few reprocussions.

#### 1. Executing to know what needs to Suspend

This is actually kind of great on the client side because it removes the need of manual hoisting. Things like `<await>` tags you find in Marko or Svelte don't have this quality. Suspense lets us we decouple async boundaries from regular component flow.

However, I've witnessed a regression of sorts where solutions are purposely co-locating these boundaries with things like routers. Having loading fallbacks as part of the routing, in Next 13 and Remix... Or newer framework picking up `<await>` tag like semantics, like Qwik's Resource tag.

Nothing is is more in your face about this perhaps than React's Async Server Components or Astro's Top-Level Await. You read at a component level which means the Suspense boundary must be in a component above it. This makes each route section entry a bit heftier as you need multiple components to define a route.

#### 2. Picking the Right Primitive

This pushes an awkward split between client and server mechanisms for data fetching. Client is almost fine-grained and server is pause/resume. Is there a single representation that can support both.

Well, on the surface, Promises. The challenge is how to represent the read. Because read matters on the client model. This is why I imagine React introduced `use` as semantically it feels closest to `async/await`. However, I have no wish to be blocking. So something like `use` is probably still fine for that.

By contrast a Primitive like Solid's Resource is pretty convenient and has this all built in, including data serialization. But there may be another challenge:

#### 3. Crossing the Boundary

Scenario, Server has Suspense boundary but no idea if the client depends on it. I was thinking about how we could subscribe to serialized Promises. But that's isn't a guarentee it falls within that Suspense boundary. In fact there are no guarentees at all.

In so I tested Next 13 I learned they don't support serializing promises across the boundaries. Which makes things a lot simpler. If you wish a Server Component Suspense boundary to trigger, well you need to await it outside of an Island. This can be addressed in the future I suppose but without running client code on the server after initial render it will never be as granular.

-----------------
### D. Mutation

#### 1. Anatomy of Mutation

Mutations primarily consist of 3 parts:
* Action
* Optimistic Updates
* Cache Invalidations

Actions mapped roughly to the idea of Form Actions and from Remix's use of the term are going to be our key mutation mechanism. While Form posts aren't essential they do provide a nice story for progressive enhancement.

#### 2. Compiled RPCs

The trick to making them ergonomic may rely on compilation. Note closure extraction/serialization has some strict rules.

First anything top level in the module can be closed over without any issue it will be just pulled into the bundle. This happens without any extra consideration, this means top-level imports, constants at the top of the file etc.

If a parent local scope does not persist only truly constant things can be serialized, ie things that can be evaluated at compile time. Any time the server is that outer scope this is true as every request is new. On the client it is possible to pass in anything closed over as long as it is serializable.

The way compilation works is hoisting up the function to the top level (which is why top level closures work). Imagine this (I'm using `server$` syntax but it could be `use server` etc..)

```jsx
function Local() {
  const myFn = server$(() => console.log("hello"))
  myFn();
}
```

Becomes on the client
```jsx
const myFn = createServerFn("123"); // creates fetch call

function Local() {
  myFn();
}
```

And on the server
```jsx
const myFn = () => console.log("hello")
register("123", myFn); // so it is exposed as API

function Local() {
  myFn();
}
```

This example was showing an inlined server function in a client scope. But similar rules would apply for server in server as well as any inlined call would need to be hoisted to be accessible.

One of the biggest concerns is accidental leaking of data. As being in the same file it is possible for the values to be closed over. One solution to this is to only allow passing RPCs via props from server to client. In so all RPCs are only defined in server scope. 

```jsx
function ServerComponent() {
  const count = db.fetchCount();
  return <ClientCounter increment={server$(() => db.updateCount())}>
    {count}
  </ClientCounter>
}
```
Keep in mind it still needs to be marked and hoisted here as you wouldn't be able to close over `count` inside the increment handler as increment will get called seperately as an RPC without running `<ServerComponent>` again.

#### 3. Optimistic Updates

Optimistic updates without a cache is a technique again really pioneered by Remix and is the right pattern here. What you can do is take any Action submission input and feed it back into client state ephemerally. This detail does require the client to coordinate, possibly in a centralized way, but through client context can pretty easily be injected. Basically submit a form, get form data as state. Submit something else same deal.

When the action completes the state empties and the client stops rendering it. The key here is optimistic updates are client rendered. This does suggest to do so you need more code in the browser. Like if you had a list of 30 comments for a blog post you might not need the code to render a comment as they aren't really interactive. By using Islands or Server Components you wouldn't need to serialize the data either.

However, to show the optimistic update you would now need the code to render a comment until the actual response returns from the server. This is a reasonable trade off for most things, but there will likely be limits to what you want to ship. You could always lazy load the client component as well as you don't need it for hydration.

```jsx 
// ServerComments.jsx
function ServerComments(props) {
  return <section>
    <ClientComments addComment={commentAction}>{
      // server rendering comments
      props.comments.map(comment =>
        <Comment comment={comment} />)
    }</ClientComments>
  </section>
}

// ClientComments.jsx
function ClientComments(props) {
  const optimisticComment = useAction(props.addComment);
  return <>
    <Form action={props.addComment}>
      <textarea name="comment" />
      <button type="submit">Submit</button>
    </Form>
    {optimisticComment() && <Comment comment={optimisticComment()} />}
    {props.children /*server rendered comments*/}
  </>
}
```
In this example Comment is a shared component that works on both the server on page render and in the client for optimistic updates.

#### 4. Cache Invalidation

This piece is probably the easiest to conceptualize but I'm unsure how to implement without help from infrastructure. If we are able to load data and dedupe it across parallized route sections we can store that data to prevent unnecessary data fetching. We could take this further and know based on the data fetched in a given route section what its dependencies are if we key the fetching. In Solid our resources have keys but one could also register with a special `fetch` call.

From there when defining our actions we can associate keys with them as well. Solid Start's `createRouteAction` works this way and this sort of automatic invalidation has worked well for years in Tanstack Query.

But on the server this requires keeping this around per user session. Which isn't the stateless experience we've had to date. Especially with edge or serverless.