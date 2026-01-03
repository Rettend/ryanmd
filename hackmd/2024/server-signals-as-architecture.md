---
# System prepended metadata

title: Server Signals as Architecture
lastmod: 2024-12-11
---

# Server Signals as Architecture

Dev Agrawal has been doing some pretty amazing work on the fringes of Signals and realtime. He's been prototyping. Picking up every not ready Solid 2.0 API to see how he can leverage the best out of it. He's been finding all the benefits and pitfalls. Seeing what lines up and what doesn't.

The question of how to handle stateful servers really is an open question right now and one that we are only just getting into.

I've focused a lot on primitives to ensure that any async on the edge of the system can consistently apply within. But I don't yet understand why or what we are building with these abstractions. So I want to step back and look at this architecturally.

## Reverse it

When we talk about UIs we talk generally state down to DOM. We focus on the GET. But to talk about this topic we need to trace back on the POST. We need to go all the way back to the event source.

Instead of thinking of our Application starting from what we render we need to think about it starting from what we interact with. What we click. That is something that always happens on the client. So if we want to have the server involved in the process it starts with understanding where and how we do that handoff.

## Event -> Server

This is how LiveView works. The moment we do an event, it is delegated on the client and sent to the server where it can handle it completely there. Then only the diff gets sent back to the browser to update.

```jsx
<div>
  <h1>Count is: ${count}</h1>
  <button phx-click="decrement">-</button>
  <button phx-click="increment">+</button>
</div>
```

You can see the delegated click attribute that has a named function that can apply to the component on the servers context. I have no idea how LiveView composes but I don't care. I'm sure it is solveable.

The tradeoff here of course is that you get no chance to intercept in the client. You can add a JS event handler but state all lives on the server:

```js
handleEvent: (event, socket) => {
  const { count } = socket.context;
  switch (event.type) {
    case "increment":
      socket.assign({ count: count + 1 });
      break;
    case "decrement":
      socket.assign({ count: count - 1 });
      break;
  }
}
```

So if were to do better what would it look like?

## Event -> Server Signal

My first thought is to have the event always execute on the client and be interceptable with JS code. Make it like LiveView where all Signal Rendering is on the server with a diffed return. But have the state setters accessible within JS events in the browser.

Are there benefits to this? Well maybe, but only if it mattered that you could do client things. Otherwise those Signals setters could just live on the server and just do a more optimal update of the view on the server and hopefully run less code and send smaller diffs.

So you could have maybe Server and Client Signals? What if the event could choose what needs to go to the server or not. Like changing the selected state could directly update part of the DOM, but switching a visibility toggle could go to the server to render the new section.

There are 2 challenges with this though. First of all how do you render something on the server when there is state only the client knows about. How do you isolate it from the client side to know it is responsible for render. We end up in "use client" land I think. Intention gets too muddled. I don't want to get there immediately so lets consider alternatives.

## There Are no Client Signals, Only Isomorphic

What if all Signal writes trigger propagation on the client and the server. If the execution never makes it to a server Derivation then we know the server doesn't have to respond with anything as the client can handle it all.

What classifies as a server derivation? Lets start with a premise that all new element rendering happens on the server. This isn't a solution for optimistic updates but lets worry about that later. Well anything that would lead to rendering new JSX. So `<For>`, `<Show>` components. Also anything that involved Async fetching of data.

Ok. So in this world the reactivity graph would need to be completely serialized. And both sides would have stable IDs. Then reactivity would synchronously propagate on the client as far as it could until it hit any async derivation. On the client these are scheduled sinks just like effects so we can send it all batched in a single payload. We'd serialize up that part of the graph and send a request to the server to update its values continue the rest of the propagation.

First consideration we see is that our payload to the server increases here a bit. It might be fine because it isn't all state just impacted state but it is worth noting. Once receiving it the server finishes the propagation from this point rendering JSX and finally sending back to the client.

Interestingly maybe all effects would live only on the client. And it is just the serialization of computed values in the graph that get sent over.

## Thinking about Compilation

Let's start with something innately client.
```jsx!
function Counter() {
  const [count, setCount] = createSignal(0);

  return <div>
    <h1>Count is: {count()}</h1>
    <button onClick={() => setCount(c => c - 1)}>-</button>
    <button onClick={() => setCount(c => c + 1)}>+</button>
  </div>
}
```

In this scenario I picture the client compiling to something like:
```js
registerRenderEffect("###", () => {
  const v0 = readScope(0); // signal
  const v1 = readScope(1); // dom node
  insert(v1, v0[0]);
});
registerEvent("###"", () => {
  const v = readScope(0); // signal
  v[1](v[0]() + 1);
}
registerEvent("###"", () => {
  const v = readScope(0); // signal
  v[1](v[0]() - 1);
}
```
The "###" are hashes from the build. This is very similar to [my resumable output I wrote about here](https://hackmd.io/@0u1u3zEAQAO0iYWVAStEvw/Hyu_IZQq2) but the assumption now is that all Signal values are serializable. In so we don't need to execute the creation code for the graph on the client. Basically this "component" can only ever run on the server and will never re-run.

Ok now what if we add something that happens only on the server.

```jsx!
function Toggle(props) {
  const [show, setShow] = createSignal(0);
  onMount(() => setShow(true))

  return <div>
    <Show when={show()}>
    {props.children}
    </Show>
  </div>
}
```

Becomes effectively something like this.
```js
registerEffect("###", () => {
  untrack(() => {
    const v0 = readScope(0); // signal
    v0[1](true);
  });
});

registerRenderEffect("###", () => {
  const v0 = readScope(1); // dom node
  const v1 = readScope(2); // bound expression (Show)
  insert(v0, v1);
});
```

The Signal write will trigger the internal Memo created by Show which would be marked as Server Only. Then it would grab the children also part of the server reactive Graph and render them setting the shows value to it.

I admit I put the div inside the component to make it more clear what was going on. If the div was outside it might not be as obvious a linking. I am missing a lot of details here. Obviously the JSX would require special compilation that is similar to Resumability.

But were a system like this to work the output would be smaller than typical resumability because there would be no expectation of client side rendering. However serialization, and serialization deduping is key because the payload for reactivity is that much more granular than for components. You don't need to serialize props. But you may need to serialize all derived chains.

## Other Consideration

### Server Events

I've been focusing on events sourced from the client but this model also support events fired on the server.. Maybe some database driven update. They could write the signals propagate as far as they can there (which is basically up until the effect) and update the serialized state and send it along.

### Optimistic Updates

I think this model suggests Client Islands. Or atleast Components that can be rendered on the Client. Signals will work on both sides so there could be the more typical experience buried in here with Signals acting as the communication layer. But hypothetically it would be interesting to see how far we can go without them. 

## Making Sense of This

That's the thing. The double data/Serialization is caused by the need to client render. We use things like Islands as a way of isolating that but client routing basically reverses our decision. One approach is to try to reverse data out of the HTML, but the other one might be to recognize that not all interactivity needs to involve client rendering. If the data clearly is on the server then maybe there is a zone where we can know to skip it. That's been the problem. We don't know from an API standpoint. I'm not sure this gets us there either.

But if we turn the whole conversation to be about serializing the reactive graph maybe there are some rules that can emerge. Let's spitball here.

1. Signals are isomorphic and live on both sides and be triggered by either.
2. Effects are generally client only, but maybe the left side isn't (we need to know what to pull on both sides)
3. Derived values can either be isomorphic or server only
4. Signals whose setter is never called from the client could be considered a server node.
5. Derived values that only read from server nodes don't need their sources serialized and could be considered server nodes.
6. It is only the intersection of server and isomorphic nodes that would require the server side of the graph to be serialized.

Like resumability this sort of automatic optimization can lead to significant behavior changes over very subtle differences. Let's check ourselves.

So the simple HN case where you have comment toggle would be completely isolated from the data that renders it which would mean if the toggle only changes a style (and update that can be client only) there is no need to go to the server or serialize the data.

If instead it actually unrendered the items every toggle would be a server communication (similar to LiveView). Neither case requires serializing the page data. I think I'd be happy with that.

Now consider another scenario where we are using the client to format some server data. Say a "joined" date on a User profile. If it is changing the data format that appears in a textnode it would mean that the User would need to be serialized. Or at minimum that date. But it wouldn't need to go back to the server to perform that update.

If the change instead was to change the visible arrangement of their profile. Then it would go back to the server to render that new profile. It might not end up serializing the user in this case.

I used these examples because both of these are around ephemeral state that isn't persisted to the database. In cases where it would be persisted then it is likely you'd be doing something more `action` like where you'd be trigger async data refetching rather than setting the Signal with a value. Which means we'd know that was always server derived.

Optimistic updates are probably the best example I can think of where server derived values meet ephemeral client state. In those cases I don't think you could ever save on serialization though. So if that is the one place it falls apart a bit I think this still all sounds reasonable.

## Could this be an improvement over diff over the wire?

I guess back to the original question. Does this have the potential to do something better than say LiveView? There is a lot of complexity here. I think the most interesting prospect isn't that there is potential to do finer grained updates, but that certain updates could stay on the client automatically. The JS output would be larger and the serialization potentially but maybe there is a path here which blends the benefit of a single model between client and server. Not 2 side by side. But the same model.

It's interesting that the areas that LiveView finds difficult are still tricky here but it seems like it could be much better at bridging the gap. That being said it does suffer from serialization boundary concerns a bit like Qwik. Except it is only the events and effects that are special. I think that alone might lower the friction. Security might be a concern too if serialization is so granular.

The key to this really comes down to understanding what can be determined at compile time and not. You want to color the graph so to speak. If that can lead to savings and still allow events to be a browser thing then you have the makings for a unified model. Of course you need a persistent server/websocket connection too so it would need to be a pretty specific architecture but I can see a world where this is where things could go. 