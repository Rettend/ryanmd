---
# System prepended metadata

title: Comparing Architectures
lastmod: 2025-07-23
---

# Comparing Architectures

I think for the most part we can boil modern application development on the web into 3 different architectures:

* SSR SPA
* Server Components
* Stateful Servers

These are all mechanisms that have client side routing and account the existence of persistent client state. Islands + Client Routing in a sense are just Server Components if they account for shared state. Qwik's resumability is an example of hyper optimizing the SSR SPA. LiveView is the posterchild of the Stateful server, but HTMX can implement both Stateful Server or a Server Component architectures.

The next consideration is what types of actions occur in these applications.

1. Ephemeral Mutation - Non-persisted, Optimistic Updates
2. Committed Mutation - Saved on server, Actions
3. Navigation - Move to the next Page
4. Initial Load - Load initial page

I want to look at all 4 of these and compare the efficiency of each architecture. I'm going to go in the opposite order that we usually talk about it because it also in my mind from simplest to most complicated. I'm going to score the approaches out of 3.

## 1. Ephemeral Mutation

These are things that don't need to go to the server to update. They might still be a part of a process that goes to the server but the update itself is purely client side. Things like selection state in a UI fit here, but so do the rendering of temporary optimistic state.

### SSR SPA (score: 3)

This is a SPA's bread and butter. All code needed to do updates is present and part of the declarative scope of the solution. You have state and you project it `UI = fn(state)`. This is a SPAs natural state of being so when this sort of update occurs with the exception of places where it triggers significantly new parts of the UI to trigger (perhaps behind code splitting) the responsiveness is consistent and immediate.

### Server Components (score: 3)

Server Component(Island) architectures have client components to handle this sort of state update. Since you are already on the page performing this sort of mutation does not require anything different than above. 

### Stateful Servers (Score: 1)

Since this model is not part of the declarative nature of the library you have 2 options. A. Run it unnecessarily through to the server. B. Require introducing a secondary mechanism. Like HTMX HyperScript or some sort of JS escape hatch. Solutions in this space are solveable just like how one can always drop out to using refs and `useEffect` in React but the scope of solution here is fundamentally limited by the model.

## 2. Committed Mutation

These are things that require saving to the database and updating the UI to reflect it.

### SSR SPA (score: 3)

While developers don't always use the most optimal approaches here to handle the update of data, there is nothing innately limiting by the architecture. For example one might do a mutation then do a second query when revalidating, but Single-Flight Mutations, GraphQL, or a slew of other solutions can solve this without the additional request. And we can always return the updated part of the data and update our own client stores.

On the client you might have the potential of getting out of sync but to provide a consistent experience to your user you know exactly what you need to fetch.

### Server Components (score: 1)

When performing an update with server components, one could limit it to the client components and have the behavior above. But assuming you are optimizing your payload and not just making a giant client, going to the server means re-rendering your whole page and data that needs to update the client components. 

At a baseline you are sending "template" + "data" instead of just the "data". You also now need to consider server-side persistent cache APIs because instead only grabbing what you need, you end up going through a single render pipeline.

Simply put compared to SPA, we are looking at increased execution, increased bandwidth.

### Stateful Servers (score: 3)

Stateful servers are really quite good here. They send the required event and then the stateful server can apply the change and only send the required updates to the client. So payload is optimal, execution minimal.

## 3. Navigation

This is what occurs when you go from one page to the next after initial load.

### SSR SPA (score: 3)

This generally involves using client side router that will parallelize your code splitting and data fetching. When you click the link the code for the next page and data will immediately load. Then once the code loads it starts rendering the next page while still suspending waiting on the data to complete. In essence the payload on first navigation is the "template" (in the JS), the "data", and the "code". All of this immediate.

On subsequent navigation to the same page the payload is only the "data".

### Server Components (score: 2*)

When navigating with Server Component router the data fetching happens on the server so we only send off the one request. However the client is not aware of which components will be needed so like initial page load on first navigation it will need to wait for the response to get the JS for the interactive components on the page. It may be less JS but there is a waterfall here. So it looks like "template" + "data", then "code".

On subsequent navigation both the "template" and "data" are sent.

> ***Special note on Preload**
Link preloading can remove the waterfall here making the only difference be the bandwidth consideration. So what I would have given 1 I upgrade to a 2 when making use of preloading.

### Stateful Servers (score: 3)

Since these do not need more JS they don't suffer the same waterfall as server components. And so on initial navigation they work very similar to SPA. You could argue a SPA sends more JS, but that it is parallelized that is rarely the bottleneck on subsequent nav.

It is still a little leg up. But they are still sending "template" + "data" on subsequent navigations. Which for me puts it on the balance.

## 4. Initial Page Load

### SSR SPA (score: 1)

This is where the even the SSR SPA has some issues. Mostly it sends the largest payload. It needs to send all the Component code, it doesn't serializes the template and the data between the code, JSON, and HTML. It executes the most code for hydration.


### Server Components (score: 2)

Server Components still double the template and data serialization but much less code is sent and executed.

### Stateful Servers (score: 3)

Stateful Servers don't really need to do much in the way of hydration. In so they don't really need to send double data/templates. Just wire up the event delegation. The biggest overhead is the delay of responsiveness for the initial socket connection. It is definitely noticeable. But tricks like event replay are able to remove the perception of this.

## Conclusion

So what am I getting at? Now to assume each of these are of equal importance is a mistake. Some apps page load is way more important than UI responsiveness. Some apps don't update their data that often.

We also should be assuming that all these solutions are as accessible to everyone. SSR SPA might be the cheapest from an infrastructure perspective because it doesn't require persistent connections or excessive caching to be performant. For some, this puts certain solutions just off the table.

My final tally was:

* SSR SPA: 10
* Server Components: 8
* Stateful Servers: 10

Stateful servers are really quite amazing where they make sense to be used. SPAs did incredibly well also really only suffering on page load.

The question is can anything in the future shift the balance here? Like link preloading makes a big difference for Server Components.

How much more attractive does SSR SPA get if hydration were solvable? What if it didn't execute all the code, like with "resumability". That might hedge it up to a 2. That serialization problem is pretty innate though.

