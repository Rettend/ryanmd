---
# System prepended metadata

title: Server Signals
lastmod: 2024-05-09
---

# Server Signals

I admit I haven't spent as much time on this topic as people have asked for since that it suggests persistence on the server. But let's pretend that isn't an obstacle and think about what it would look like.

The content here is hypothetical. Not all these capabilities exist today, but I believe they could.

## Prior Art

The first thought here is stuff like Phoenix Liveview which keeps state on the server and then sends basically VDOM diffs over to the client. That is one way to do it. Basically delegate all events from client and then perform updates on the server. I think this model could be improved dramatically with more granular rendering on the server but lets consider other opportunities first.

Meteor.js is the other one that comes to mind. I know nothing about Meteor so maybe it is time I take a look. From what I see it looks more manual on subscriptions. It is possible that it works smoother than I'm thinking and I will revisit once I explore my thoughts here some more.

## The Nature of Signals and Async

Signals are a great synchronization system. So within a single environment they ensure all updates propagate in a single frame. That update might not happen immediately and be scheduled or the next microtask, but it will all happen together.

However, the network or even storage retrieval is async by nature. It isn't really in the graph but at the boundaries. We are best to think of things as multiple connected graphs then a single graph. We can adjust the developer experience perhaps to make it not require async coloration and my work into Solid 2.0 and `createAsync` are efforts in that direction but we need to acknowledge that on some level that async resolution is an entry point into the graph, not a typical propagation.

The other consideration is auto-tracking doesn't work with async. I'm not worried about tracking after a fetch but more that the dependencies across network boundaries in 2 way communication is probably going to need to be explicit.

## Types of Solutions

So when considering a client/server relationship here I think we can categorize into 3 scenarios:

### 1. Server Signals Only

This is basically the LiveView equivalent. You have a graph on the server and when signals update you schedule effects which are essentially rendering on the server and sending updates to the client to be inserted. The client just needs a protocol to handle the incoming updates and apply them.

This approach is low on JS which is nice but I'm not sure it scales well to interactive client stuff as basically all state is stored on the server.

### 2. Client Signals Only

This is basically where SolidStart is. With our `"use server"` functions being used both as a format to send mutations and to fetch data it feels very signals native because server functions are just functions and our `createAsync` primitive can just call it and our downstream signals handle all rendering in the client.

This approach requires all the JS but it doesn't require a persistent connection. We don't really care what the backend is here.

### 3. Hybrid Solutions

To me a hybrid solution mostly starts from what if you take #2 and let the connections persist. Server functions in SolidStart, Qwik, and I think even Next support ReadableStreams and Async Iterators to be serialized over the wire. Honestly you could use any protocol here as long as it was configured I think. So Server Sent Events or WebSockets could be an option but so could just using Fetch really. I'm going to use Fetch for the remainder here because it is something I understand better.

## Stream -> Async Iteratables

Promises are great if you want to await async data, but if we have a persistent connections we need streams. The most universal mechanism I can see for that right now is an Async Iterable. ReadableStream implements it, as does Observables.

So if the core async primitive supported it you could do something like this:

```js
// browser signal
const [userId, setUserId] = createSignal(1);

const user = createAsync(() => getUserStream(userId()))
```

Every time `userId` changed it would tear down and recreate but as long as the id was the same it would continue to get the latest values. Things like Suspense would only apply between the creation and the first response, as from that point on from the client graph perspective it would be consistent.

What is interesting is the implementation of `getUserStream` could be anything... It could be a fetch request you made yourself but it could also just be a generator server function:

```ts
async function* getUserStream(id: number) {
  "use server";
  yield await Promise.resolve('a');
  yield await Promise.resolve('b');
  yield await Promise.resolve('c');
}
```

A ReadableStream:
```js
async function getUserStream(id: number) {
  "use server";
  return new ReadableStream({/* ... */})
}
```

Or maybe a server side signal accessor?
```js
"use server";
// some existing signal/computation on the server
const [user, setUser] = createSignal(0);

export async function getUserStream() {
  return user;
}
```
A bit forced perhaps but we need to recognize that we need boundaries. So I'm using ``"use server"`` here (could be any convention). And I'm using `createAsync` to consume it. I think the DX for this would be perfectly good.

It's possible we could just export the Signal from a `"use server"` file and have this behavior:

```js
"use server";
// some existing signal/computation on the server
const [user, setUser] = createSignal(0);

export const getUserStream = user;
```


This approach could probably also be done with Server Sent Events as the communication is only one direction after the initial connect and any change of the params would cause a re-connection.

## 2-way Communication

Fetch has another interesting quality in that it supports ReadableStream request bodies. Which means if we wanted to get fancy we could serialize Signals as arguments.

```js
// browser signal
const [userId, setUserId] = createSignal(1);

// pass userId but don't read it
const user = createAsync(() => getUserStream(userId))
```

In this case when `userId` updated it wouldn't cause `createAsync` to run again tearing down and creating a new connnection but just update the request body being sent to the server function already.

It would be interesting if you could:
```js
async function getUserStream(id: Accessor<number>) {
  "use server";
  // some first run setup

  // only function in the closure runs again on id change
  return createMemo(() => db.getUserSubForId(id()));
}
```

In so only the Memo would update as the id changed, and then the updated user would propagate to the client.

## Direct Server Signals?

I am a big fan of read/write segregation. So I've been showing how this would work within a Query/Mutation setup. Basically the streams are all on the Query side and then the mutations are just normal requests, that upon commiting their changes end up starting the chain that pushes the update back through all the streams. This maintains current practices and we have good patterns for handling caching and invalidation.

But what if you didn't? What if you wanted to create a writable Async Signal that was a one for one representation with something on the backend?

What if you could just import it from a `"use server"` file?

```js
import { serverCount } from "./serverCount"

const [count, setCount] = serverCount;
```

```js
"use server";

export const serverCount = createSignal(0);
```

The tricky part is that the client doesn't know what sort of reference it is getting. So you'd have to tell it somehow. Funny enough something like the tuple destructuring would be enough (as you don't do that to a function) and a proxy could detect that usage. But that wouldn't help with derived/computed exports which are just functions.


Worse comes to worst you'd need to wrap it like:
```js
import { serverCount } from "./serverCount"

const [count, setCount] = serverSignal(serverCount);
// or maybe:
const [count, setCount] = serverCount.signal;
```

I think to implement this for real though you'd probably want to batch the sets so they happen in a single go, as while this is just a server function thing going this granular on mutation might be noisy. Also these are singletons which might not work great. I could see using a proxy to sort of guide the subscription to the right place but this approach doesn't really have input parameterization.

## Closing Thoughts

I'm not sure how much of this is actually really useful. And there are some awkwardnesses in that for SSR performance Solid actually replaces all Signals on the server with simple vanilla getters.. there is no reactivity. We do bundle `"use server"` seperately so it could have different rules and leave them in. I think that makes sense. Isomorphic Signals on the server are a completely seperate graph to those intended to live on the server.

Also this whole server doesn't need to be a server. It could just be a service worker or whatnot so there is potential for layers here.

Finally, haven't thought too much about concurrency yet. And if that has a role in how mutation should be handled. Like there is a difference between having an API that sets the next value and one that performs the action "Add one". Setting value means last in wins generally, where "Add one" is incremental. However, the user did see the previous value so if the current value is 1 and two users add 1 at the same time it is situational whether they expect the results to be 2 or 3.