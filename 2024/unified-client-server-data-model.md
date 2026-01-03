---
# System prepended metadata

title: Unified Client/Server Data Model
lastmod: 2024-01-21
---

# Unified Client/Server Data Model

## Unified vs Universal

I say unified because this is not universal. One of the challenges people have been having with Server Components or even to a certain degree with the server loader/action like Remix vs Client-driven approaches is that when you move data fetching/mutation in bulk to the server, you lose the granularity of updates people have come to expect from Single Page Apps.

It happens because these solutions lose information on what has changed over the wire, and in the case of Server Components we are no longer dealing with data being sent back. Things have been boiled down to a tree structure. The server basically forms a second `ui = fn(input)` cycle, or as in a recent Dan Abramov article: `ui = fn(data)(state)`.

The challenge is each of these cycles has its own independent input. Yes `state` can be derived from `data` (or cloned). But the thing is where you feed the data impacts how change occurs in your application. Because `data` isn't static and any unidirectional update cycle needs to close the loop. Ie if the data comes from Server Components, then the mutation needs to run back through the Server Components, if data comes from Client Components then mutation can impact them.

For a while I was attempting to think through if this could all be one model. But loading data in each place as repercussions.

### Client Component Data

* Can be fetched initially during SSR
* Stored in the browser
* Persists client navigation
* Can be updated granularly, and cause granular UI updates

### Server Component Data

* Lasts life of the request unless opting into other persistence
* Rendering is always new creation, never a granular update, always top-down
* All data required to render UI must be present
* Code, data for rendering UI not required in the browser

Basically, beyond deciding Server/Client component divide on the statefulness of component, some data just works better fetched from Client Components. Sometimes you perform too many partial updates that it makes no sense to reload everything, every time on the server, even though you would like to benefit from not shipping the code or taking the serialization hit.

> When I talk about Client and Server Data I don't mean Client as in only pertaining to the Client, but as in Client like Client Components. This Data is part of initial SSR and it can be acted on in Server Functions. It isn't that this data isn't from the Server, but that its lifecycle is part of the Isomorphic flow rather than the Server Only flow.

## Challenge Today

This tension is real. All the conversation right now is around getting the benefit of loading Data in Server Components but it isn't the right model for everything because of the tradeoffs. Server Components models today definitely favor Read-heavy rather than Write-heavy workloads. And going between them is not smooth with different APIs, especially because almost no consideration is being given to the Client Data driven flows as of yet.

Like if you are fetching data in Client Components those waterfalls are more impactful again, but does say Next App Directory help you here? Not at all. I'm not really pointing fingers, just that everything is so pushing on the hope that we only need the one approach to data, and unfortunately it falls short.

## Unified Proposal

So I figure I'd sketch out how I might approach a unified model in SolidStart. Keep in mind the example here will be trivial. I might even have opted into Server Data for it but I want to keep it simple so I can show the pieces.

It starts with having a single primitive for handling `cache` and `action` that works both in Server and Client Components. There is also in our case `createAsync` a Promise -> Signal primitive that importantly doesn't support mutation.

### Setup

```jsx
/* Page Server Component */

// another Server Component
import UserDetails from "./UserDetails";
// Client Component
import UserTodos from "./UserTodos";
// data APIs
import { getUser, getTodosForUser } from "./data"


export const route = {
  load({ params }) {
     // client data preloading
     getTodosForUser(params.id)
  },
  server: true // unclear which is default
}

export default User(props) {
  // server data loading
  const user = createAsync(() => getUser(props.params.id));

  return <Suspense fallback="Loading User...">
    <UserDetails user={user()} />
    <UserTodos userId={props.params.id} />
  </Suspense>;
}
```

```jsx
/* UserDetails.jsx */
import { updateUserName } from "./data";

export default function UserDetails(props) {
  return <form
    action={updateUserName.with(props.user.id)}
    method="post"
  >
    {/* ... */}
  </form>
}
```

```jsx
/* UserTodos.jsx */
"use client";
import { getTodosForUser, updateTodo } from "./data";

export default function UserTodos(props) {
  const todos = createAsync(() => getTodosForUser(props.userId));

  return <Suspense fallback="Loading Todos...">
    <For each={todos()}>{
      todo => <form
        action={updateTodo.with(todo.id)}
        method="post"
      >
        {/* ... */}
      </form>
    }</For>
  </Suspense>
}
```

```jsx
import db from "some-db"
import { cache, action } from "@solidjs/router";

export const getUser = cache(async (userId) => {
  "use server";
  const res = await db.findUserById(userId);
  return res.data;
}, "users");

export const getTodosByUserId = cache(async (userId) => {
  "use server";
  const res = await db.findTodos({ userId });
  return res.data;
}, "todos");

export const updateUserName = action(async (userId, formData) => {
  "use server";
  const name = String(formData.get("name"));
  // ... validation ...
  await db.saveUser({ name });
  // does nothing is implicit reload of the page
});

export const updateTodo = action(async (todoId, formData) => {
  "use server";
  const completed = !!formData.get("completed");
  // ... validation ...
  await db.saveTodo({ completed });
  throw reload({ revalidate: "todos" }); // only revalidate todos
});
```

### Initial Load

SSR occurs as usual with content streaming in and hydrating. Both client and server data load on the server. Client data is serialized on the whole and server data is serialized at client component boundaries. In this case just `userId`. Code for `UserPage`, and `UserDetails` is not shipped to the browser. Only `getTodosForUser`, and `updateTodos` appear in the client bundle although just as RPC calls as their code is a server function. The route config is also part of the client bundle including the `load` function.

### Navigation

If one started on a different page, like a Home Page and then navigated here, the following would occur.

1. Client matches the route and:
    * Determines whether each section is a client or server route (sees it is server)
    * Starts loading the JS needed for the route sections (grabs `UserTodos` client bundle)
    * Runs any `load` functions in parallel (starts loading `getTodosForUser`)
    * Does page request to the server for Server Component output in parallel
2. On completion of ServerComponent Output
    * Ensures Client Island JavaScript
    * Initiate partials/diff
    * Render Client Islands
    * Suspends any components waiting on data
3. On Client Data Completes
    * Write to client cache ("todos" in this case)
    * Resolve Suspense

### Client Data Mutation (Reload)

1. Perform Server Action
   * Start Transition, Make RPC call, perform database update
   * Catch `reload`, `redirect`, or default everything Client (see only `"todos"` are invalidated)
2. Resolve next route and check load functions
   * In this cases it is a `reload` so on the same route run `load` functions in `data` mode where any cache function it hits only runs if it matches the key.
3. Keys and promises are serialized and streamed back to the client
   * Client checks keys and updates cache with appropriate promises
   * `createAsync` calls are triggered, adding to the inflight transition.
4. Promises resolve finishing Suspense/Transitions

### Server Data Mutation (Reload)

1. Perform Server Action
   * Start Transition, Make RPC call, perform database update
   * Determine if it is same page(nothing) or `redirect`
2. Resolve next route and render Server Components
   * In this case it is the same route so it just renders server components
3. Stream response back
   * Client handles partial diffing and finishes Transition

### Client + Server Mutation

This can happen for a few reasons. A Client Data mutation causes a `redirect`, or there is a desire for the mutation to update both Client and Server data. Conceptually cache keys for Server Data from the client perspective are `urls`.. like if you want to invalidate server pages use `redirect.`

In these cases both of the above happen. Affected page sections are both Server Component rendered along with any appropriate cache data from the `load` function. Since both mechanisms are based on single flight mutation and streaming they should all be able to be processed in a single Request.


### Client Only Routes

It is possible to make Routes not Server Component at the root with this approach. In that case all routing is client side so Navigation works the same as today, with the JS chunks being the page instead of the Client Islands. The biggest difference is instead of just updating the URL with the server reponse expecting the Partials to take care of the UI updates, a Client only Route would need to client render the next page. If a Client only Route doesn't fetch any data it wouldn't even take a trip to the server.

### Preloading

One interesting part of this is preloading would probably want to cache the Server Component response as well. Use the preload cache based on I guess the route segment. It could be possible based on the current route to know which segments change in the client and wire it up appropriately. This all assumes the client is aware of all the routes anyway.

### Persistent Server Cache

One additional adaption that can be made here is introducing Server backing for the cache function. Then re-rendering Server Components won't necessarily fetch all the Server data. While not as optimal still as Client Data this can help as application grows. Server Data driven Actions can invalidate keys in the same way as the Client.

## Reflecting on the Example

This was a simple example where when the User updated the Todos did not and vice versa. If the UserName was passed into the Client component it still could have updated the name. If these were all Server Data run even if in different route sections we'd have needed to always fetch the Todos again on a User change (especially if the name was passed in). I wouldn't say that is reason enough to split it off, but if the "Todos" were something very interactive and dynamic it would make a lot of sense.

It's important to understand that given multiple sources Client Data never gets less granular, but that isn't the case for Server Data. As much as we all want some universal model, maybe something like this would allow catering better for the specific use case. You could have pages that are almost static doing it all server data and ones that aren't using more Client data without either model feeling inadequate for their usage.

There may yet be universal solutions out there but right now it feels like the conclusion is consistent with the problem. Like these are innate qualities and we shouldn't be trying so hard to fight them.

## Appendix

### Idea: Seed with Client Props

Instead of using the `cache` serialization perhaps we could simply pass the props through from the server. The question is if this could prevent the need for a `load` function? And would we have the means to initialize the `cache` this way?

If we assume that all `redirects` need to be handled via Server Components and all navigation in general could be handled this way remove the need to hoist, that only leaves mutation. Without using the load run trick we don't know which functions to call so that probably sticks us on multi-flight.

The `cache` probably couldn't be seperated from `createAsync` because we wouldn't call the cache if we got the initial value from props. I mean we could add logic manually to initialize it and since our components run once maybe that wouldn't be terrible:

```jsx
"use client";

export default function UserTodos(props) {
  cache.set(getTodosForUser.keyFor(props.userId), props.todos);
  const todos = createAsync(() => getTodosForUser(props.userId));
```

And the page component would look like:
```jsx
/* Page Server Component */

// another Server Component
import UserDetails from "./UserDetails";
// Client Component
import UserTodos from "./UserTodos";
// data APIs
import { getUser, getTodosForUser } from "./data"


export default User(props) {
  // server data loading
  const user = createAsync(() => getUser(props.params.id));
  const todos = createAsync(() => getTodosForUser(props.params.id));

  return <Suspense fallback="Loading User...">
    <UserDetails user={user()} />
    <UserTodos todos={todos()} userId={props.params.id} />
  </Suspense>;
}
```
It is definitely interesting thought that explicit hoisting could go away with this pattern (you'd still want to bring it up to the page component). I suppose prop drilling through the Server Components might be onerous.  So waterfall concerns still stand.

The other interesting question is could this mean that `createAsync` wouldn't need to worry about serialization at all. Like if you assumed all SSR was a form of SCs could you do away with it. We already don't serialize it on the server, but it would mean that all data fetching you didn't want to repeat on hydration would need to be coming from RSC props (or from a `cache`). This is aggressive position for the ecosystem but it is attractive from keeping things simple.

EDIT: In hindsight render once model actually doesn't help us much with cache initialization. Because it just isn't initialization We need to react to both SC prop updates and invalidations. An `isHydrating` is probably insufficient. Not to mention setting the cache the way I illustrated above wouldn't work during SSR. The problem in general is we need a source switch depending on what changes. There may be a Solid primitive for that but there is some amount of complexity here.