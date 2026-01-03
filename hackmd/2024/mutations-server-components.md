---
# System prepended metadata

title: Mutations & Server Components
lastmod: 2024-01-15
---

# Mutations & Server Components

Something that has become more apparent to me over time is most of the misalignment with Server Components comes from the mutation story. We are used to have the most optimal updates in the client from SPAs and the departure to Server Components has been one that has left a lot wanting. Meaning it can't succeed at being good enough for everyone.

Mutations are also the source of a lot of the complexity. Server Components sans mutation do not require any diffing! If you are only ever navigating to new locations then you are free to just straight replace and no need to preserve Islands for anything below the change. As everything below the change is new. It is only the ability to "refresh" on the same page that brings the desire for diffing. And perfect diffing requires more than just HTML but knowledge of the structure/keyed items that lends more intermediate structures like VDOMs.

More over with mutation, naively it needs to refresh the whole page, whereas with navigation we only need to update the new sections. So I want to look at how much of a departure this is and see if there is a path to best of both worlds.

## Mutation Slippery Slope

### 1. Direct Mutation

This is the most efficient way to do change. When you update a Todo in a list simply return the updated `Todo` and you are responsible for applying the update yourself.

#### Example:
- Simple fetch/setState

#### Pros

* Complete control over how change happens
* Single flight mutation(out) - patch(in)
* Caching is optional
* Mutations are arbitrary and don't necessarily need to be a defined thing

#### Cons
* Always requires manual mutation to apply changes (in atleast some cases even with defined schema like GraphQL)
* Difficult to apply changes that impact more than one resource
* All data is required to be in the browser as you need to be able to manually update it.

### 2. Key-Based Re-validation (Client)

This became popular after people got tired of wrestling with direct mutation or exceedling complicated systems to manage direct mutation. Instead it uses keys as a way of indicating what needs to be refreshed on mutation. Instead of sending the patch back, any defined mutation may indicate what needs to be refetched via key.

#### Example:
Tanstack Query

#### Pros
* No need to manual update logic, data automatically goes in the right place propagates
* Can invalidate as many resources off a single mutation as needed.
* Caching is optional atleast with reactivity (and is very easy to add)


#### Cons
* Generally is multi-flight. First request does mutation and indicates revalidation, 2nd request does invalidation.
* All data is required to be in the browser as you need to be able to read from any key when updating any key.

### 3. Route-Based Re-validation

This was popularized by Remix. It assigned each route with loader/action as a way to mirror traditional (MPA) website while still maintaining SPA architecture.

#### Example:
Remix

#### Pros
* No need to manual update logic, data automatically goes in the right place propagates
* Can invalidate many resources off a single mutation.
* Less Data fetching logic required to be in the browser

#### Cons
* Generally is multi-flight. First request does mutation and indicates revalidation, 2nd request does invalidation.
* Loss of granularity, at best route section level, but most likely full page
* All data is required to be in the browser as you need to be able to hydrate it.

### 4. Server Components

First shown by RSCs, the idea sort of extends on the route based re-validation but assumes that the root of each page section can be rendered on the server to reduce the size and execution of code.

#### Example:
Next RSCs

#### Pros
* No need to manual update logic, data automatically goes in the right place propagates
* Can invalidate many resources off a single mutation.
* Single flight mutation(out) - next page(in)
* Less data, data fetching and rendering logic required to be in the browser

#### Cons
* Loss of granularity, generally full page
* Cache required on server if you wish to save work.

## Weighing the Tradeoffs

Generally the problem is as you go down this list the worse it scales with more complexity in your app. The more different data sources you have on the page the less optimal it becomes. While each improves on the weaknesses of the previous by the time we get to end you have to ask specifically in the case of mutation are we better off?

I actually don't think so. Consider if you addressed the multi-flight nature of #2 Key based Revalidation. Then the only weakness is that everything is in a client. Ie.. it's SPA. And that isn't hard to do if your router is cache aware and the revalidation is part of communication protocol.

### 5. Route Aware Key-Based Re-validation

Using cache APIs in route loaders means we can run load functions based on route on the server and only execute functions with matching keys.

#### Example:
Solid Router + Data APIs (with single-flight, not implemented yet)

#### Pros
* No need to manual update logic, data automatically goes in the right place propagates
* Can invalidate as many resources off a single mutation as needed.
* Caching is optional atleast with reactivity (and is very easy to add)
* Single flight mutation(out) - next route data(in)


#### Cons
* All data/code is required to be in the browser as you need to be able to read from any key when updating any key.

However, Server Components closest equivalent would be to run all load functions and only render route sections that have keys that require invalidation. But the problem is that those sections may require other data to render which means they need to fetch everything else for them anyway or aggressively cache on the server. Unlike in the client between requests the data isn't there unless you are storing it somewhere.

### *Is Relying on a Server Cache Bad?*

Well it could be because it relies on your infrastructure. Like a lot of the decisions we make are because we don't want stateful backends. Stateful backends could simplify a lot of what we do, and turn things like RSCs on their head.

But needing cross request caching to scale requires infrastructure, too. It is not just in-memory on your machine because of multiple deployments. It means things like Redis or whatever Vercel, Netlify, AWS, or whoever wants to sell you to get this working.

Now you always need stuff like this at large scale to be sure. But I'm not talking about scale of end users here, but scale of complexity in your app. This is completely independent.

## What Else Can We Do?

So my gut is this is significant. Which means it might be better to revisit #5 with a different lens. Is there any other ways to accomplish everything without server cache?

I'm not sure. If the server can't persist state (including caches) that means that we can only be rendering on the server when we know we are getting fresh data. Ie.. on initial page load, or new navigation. And even nested navigation risks tearing if the server could fetch newer versions (uncommon in client apps as they share state).

However, we do know those dependencies. In a sense if someone navigated from the `posts` to the `replies` tab and the user's name changed since the initial load ideally you might want to server render the `replies` but also provide the updated user data since a parent relies on that as well.

Ok but how can we take something that was server rendered, and then client update it without incurring the cost of hydration and double data serialization on initial load?

Resumability is the obvious answer to the first question. Don't hydrate it. Of course you are still sending the code but maybe who cares as it isn't executing.

But saving on serialization is harder. As is knowing not to try to server render client components on future navigation as they could depend on global client state. Resumability doesn't solve either of these. Those are what Server Components solve with clear boundaries.

Now combining both could probably result in a non-diffing approach where there are set boundaries for serialization/client rendering and then since we don't care about hydration cost(thanks resumability) we actually ship all the code. In so we can do non-diff data updates similar to what I described.

But I do wonder if rendering anything on the server after initial load matters in that case, and is server components aren't an on server guarentee why would you the developer go around marking serialization borders? If it were `use island` would that feel any better? An `island` wouldn't determine which JS is shipped or even what hydrates. It would just mark the serialization entry point of your app and what should be client rendered always after initial page load.

Well enough thoughts for one day.