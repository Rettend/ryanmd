---
# System prepended metadata

title: Resumability without Serialization
lastmod: 2023-07-17
---

This document explores an idea of doing resumability without serializing anything more than you would in a typical SSR setup. While zero serialization is not an option the idea is to focus on reactive execution flow rather that code splitting.

The theory is that all the serialization happens because of partial hydration, not because of resumability. And beyond that serialization is a performance optimization (analog to caching).

Understanding that this aims at just being a replacement for hydration. Basically a different compilation than we have today but is a replacement rather than an added feature.

### *Is this truly resumable?*

Well it doesn't hydrate. The first time code runs is when the state changes and it doesn't do a prepass hydration run but just runs the change. While the initial execution might require more work than Qwik(see Exceptions below) it should still be significantly cheaper than hydrating.

Hydration is the process of re-executing the code in its initial state before running it with its updated stated. Since it needs an extra pass we tend to do it eagerly. This shouldn't.

## What is Eager?

We should recognize that some things do need to happen eagerly.

1. Attaching Event Listeners
2. Effects/onMount
3. Lazy Component Preloading


### 1. Attaching Event Listeners

Attaching listeners are trivial as we already do that through the use of global event delegation. That being said we collect and replay events right now. We still need to know when to replay them, so when the code loads there is still replay events hook that should run. This is probably the last thing after all other eager code.

### 2. Effects/onMount

Qwik does something with visibility that is cute. There may be a case for that but generally speaking we should trigger these as soon as we can. Of course we need to run them in the right context so, we actually need to register that this execution needs to happen from the server render.

### 3. Lazy Component Preloading

Because code needs to run during hydration we hit all the lazy components on that pass pretty quickly. Here we would not. To be fair we do resource preload in the `<head>` or maybe headers so in theory maybe we don't need to do anything eager here. But if we do it would probably be similar to Effects where we register as we run.

## Simple Example

Let's start with the simplest example:

```jsx
export default function Counter() {
  const [count, setCount] = createSignal(0);
  console.log("I should not log in the client");
  return <button onClick={() => setCount(count() + 1}>{count()}</button>
}
```

```jsx
// client compilation
import { createSignal } from "solid-js";
import { template, register, registerEvent, readScope, writeScope, insert } from "solid-js/web";

const t0 = template("<button>")
const s0 = register("###", () => writeScope(0, createSignal(0)));
const s1 = register("###", () => console.log("I should not log in the client"))
const s2 = register("###", (tmpl) => writeScope(1, getNextElement(tmpl)));
const s3 = register("###", () => {
  const v0 = readScope(0);
  const v1 = readScope(1);
  insert(v1, v0[0])
});
const e0 = () => {
  const v = readScope(0);
  v[1](v[0]() + 1);
}
registerEvent("###", e0);

// normal client render path
export default function Counter() {
  s0();
  s1();
  _el$ = s2(t0);
  _el$.$$click = e0;
  s3();
  return _el$;
}
```
When app starts ups we only run:
```jsx
const t0 = template("<button>")
const s0 = register("###", () => writeScope(0, createSignal(0)));
const s1 = register("###", () => console.log("I should not log in the client"))
const s2 = register("###", (tmpl) => writeScope(1, getNextElement(tmpl)));
const s3 = register("###", () => {
  const v0 = readScope(0);
  const v1 = readScope(1);
  insert(v1, v0[0])
});
const e0 = () => {
  const v = readScope(0);
  v[1](v[0]() + 1);
}
registerEvent("###", e0);
```
I use `###` a bunch in these examples. Assume it is a compile time hash based on like the file name and the line number of the code. Something unique we can use to find the code, and when combined with a runtime generated id to lookup scope we can in the background find the right data instance.

`template` registers a template but doesn't create DOM nodes until executed the first time.
`registerVar` creates a variable at the scope purely by hoisting, however it does it lazily and is assigned a hash at compile time to lookup the code for it. Calling the return value just runs the callback function.
`registerEvent` also assigns to a hash for lookup. If the click handler can be serialized into the html like:
```html
<button $$click="###">0</button>
```
Where `###` is a combination of the hash for the event handler and the id of the scope then we can basically set the current scope before we run the event and lookup the code that we registered to run it.

As the event runs it calls readScope to get the local reference at index 0. At which point it finds that it contains a serialized value that contains:
* hash location of the code to initialize the variable
* a list of locations for any dependencies it may have

Given that hash location we call it and create the Signal at the location and then we go lookup the dependencies. In this case it will the `insert` (instance of `s3`) that handles inserting the value in the DOM. It does a lookup that grabs the element from `s2`.

And that's it. Basically we needed to serialize nothing and it didn't run any code until we did the event.

Is this an improvement over delaying hydration? If this was your whole app. Not really since we needed to basically run all the code in the end. We did not run the renderEffect in `insert` twice though. And that `console.log` never runs in the browser. But there is definitely a code size increase.

However, if you had 30 of these sort of interactions on your page you skipped running them until you interact. The startup code cost is minimal, just registering things in a map.

## Props

```jsx
// Counter.jsx
export default function Counter() {
  const [count, setCount] = createSignal(0);
  return <Button onClick={() => setCount(count() + 1}>{count()}</Button>
}

// Button.jsx
export default function Button(props) {
  return <button onClick={props.onClick}>{props.children}</button>
}
```

```jsx
// client compilation
// Counter.jsx
const s0 = register("###", () => writeScope(0, createSignal(0)));

const s1 = register("###", () => ({
  get onClick() {
    const v = readScope(0);
    v[1](v[0]() + 1);
  },
  get children() {
    readScope(0)();
  }
}));

export default function Counter() {
  s0();
  return createComponent(Button, s1());
}

// Button.jsx
const t0 = template("<button>");
const s0 = register("###", (tmpl) => writeScope(0, getNextElement(tmpl)));
const s1 = register("###", () => {
  const v0 = readProps();
  const v1 = readScope(0);
  insert(v1, () => v0.children)
});
const e0 = (...args) => readProps().onClick(...args);
registerEvent("###", e0);

export default function Button() {
  _el$ = s0(t0);
  _el$.$$click = e0;
  s1();
  return _el$;
}
```
Ok not much explanation here, but lets assume we can do this as it is basically the same proposition. Context API would be similar as well. The key is figuring out how to inject the right scope at the right time. It could be intercepting getters, it could be a slightly different API.

But my thinking is if Components had hierarchical IDs then removing the last number sequence would have you at the parent Component. And you could trace this up props or Context as you needed.

## What about other References?

Well lets simplify at first and assume that only `const` are allowed in component bodies. No `var`, no `let`.

### Module Scope

```jsx
const by = figureOutSomething();

export default function Counter() {
  const [count, setCount] = createSignal(0);
  return <button onClick={() => setCount(count() + by}>{count()}</button>
}
```

It should be obvious but this case doesn't matter. It will always run once when the module is loaded on the client. Analysis isn't needed. It can be an import it can be anything. In this specific case this should not run on the server if we knew the experession was pure because event handlers are compiled out.

```jsx
// client compilation
const by = figureOutSomething();

const t0 = template("<button>")
const s0 = register("###", () => writeScope(0, createSignal(0)));
const s1 = register("###", (tmpl) => writeScope(1, getNextElement(tmpl)));
const s2 = register("###", () => {
  const v0 = readScope(0);
  const v1 = readScope(1);
  insert(v1, v0[0])
});
const e0 = () => {
  const v = readScope(0);
  v[1](v[0]() + by);
}
registerEvent("###", e0);

// normal client render path
export default function Counter() {
  s0();
  _el$ = s1(t0);
  _el$.$$click = e0;
  s2();
  return _el$;
}
```

### Component Body

If it is something that cannot be evaluated then it is the same as any other expression and we will run it when we pull for it. However if it can be resolved we can inline it.

```jsx
export default function Counter() {
  const [count, setCount] = createSignal(0);
  const by = 2;
  return <button onClick={() => setCount(count() + by}>{count()}</button>
}
```
Becomes effectively:
```jsx
export default function Counter() {
  const [count, setCount] = createSignal(0);
  return <button onClick={() => setCount(count() + 2}>{count()}</button>
}
```
### Derivations

```jsx
export default function Counter() {
  const [count, setCount] = createSignal(0);
  const doubleCount = createMemo(() => count() * 2)
  return <button onClick={() => setCount(count() +1}>{doubleCount()}</button>
}
```

```jsx
// client compilation
const t0 = template("<button>")
const s0 = register("###", () => writeScope(0, createSignal(0)));
const s1 = const s0 = register("###", () => {
  const v = readScope(0)
  writeScope(1, createMemo(() => v[0]() * 2))
});
const s2 = register("###", (tmpl) => writeScope(2, getNextElement(tmpl)));
const s3 = register("###", () => {
  const v0 = readScope(1);
  const v1 = readScope(2);
  insert(v1, v0)
});
const e0 = () => {
  const v = readScope(0);
  v[1](v[0]() + 1);
}
registerEvent("###", e0);

// normal client render path
export default function Counter() {
  s0();
  s1();
  _el$ = s2(t0);
  _el$.$$click = e0;
  s3();
  return _el$;
}
```
This flow works very similar to the original example creating stuff as we ask for it following the hash loacations. We know dependencies of Signal and the Memo from server rendering and then can call their respective methods when we update the value.

### Async

```jsx
export default function Users() {
  const [data] = createResource(fetchUsers)
  return <h1>{data()}</h1>
}
```

Well, this is something that you would want to serialize. Whether using `resource` internal mechanism or some future `cache` mechanism. This still works a similar way.

```jsx
// client compilation
const t0 = template("<h1>")
const s0 = register("###", () => writeScope(0, createResource(fetchUsers)));
const s1 = register("###", (tmpl) => writeScope(1, getNextElement(tmpl)));
const s2 = register("###", () => {
  const v0 = readScope(0);
  const v1 = readScope(1);
  insert(v1, v0[0])
});

// normal client render path
export default function Users() {
  s0();
  _el$ = s1(t0);
  s2();
  return _el$;
}
```

Well this example was a bit of a trick because the resource has no reactive source it can never update so the code here just basically does nothing until it is later client rendered. If the resource did depend on a Signal then it would be in that Signals dependency list.

And it would run and fetch again (unless in the cache) but you changed the source so that is expected. Basically resumability solves the data fetching problem innately to a certain degree because you don't have to hydrate things so you don't need to run them until they change.

## Exceptions

### Unnecessary Execution

Well ok I've over simplified to this point. First the basis of this is that you can always lazily resolve things. It may not be efficient as not running them but it is way more efficient than hydration. But does this fall apart?

Yes, merging sources.

<pre>
A   B
|   |
C   D
 \ /
  E
</pre>

If we update `A`, then `C` is invalid, and in order to update `E` we need to read `D`. But if `D` isn't serialized well we actually need to calculate it from `B`.

So a change in `A` actually naively causes the execution of `D` that wouldn't have happened under normal flow as `D` would have been calculated previously.

We need to decide how important this is. My conjector is while serializing all derived state (or atleast selective derived state which is consumed by an observer with multiple sources) would ensure no unnecessary execution it would also mean every reactive boundary basically needs to be serializable.

We are back at `$` or some hidden rules. Whereas assuming only specific primitives are serialized (ie ones that deal with async) we aren't doing any more work than a partial hydrating solution. In fact we are doing less work than a VDOM solution.

We could also say all Memos need to be serialized but we don't need to go there yet perhaps. My point is default could be not serialize with opt in.

### Structural Changes

See no one has really solved this in a fine-grained way. It's why Qwik uses a Virtual DOM. To be fair no one had done fine-grained hydration before SolidJS either so finding a solution here is probably a similar sort of effort.

The key to hydration in Solid is that we rely on stuff being created in the same order so that we can generate the same ids at the same time to find the appropriate places in the DOM. We call these hydration ids or you've seen them as `data-hk`. If we are to handle resumability we need to basically pick up the right count mid structure which means we can't just rely on creation order matching.

We still need to get references to DOM nodes so that we can remove/move them as needed. Most control flow is conceptually a derived map. So if we are serializing things as we go on the server we do know say what id the component has and when we wake up we know that as part of the scope we set. As long as each break point knows its id then we can still generate the right hydration ids.

However, this may mean a greater number of markers than just templates. We already separate expressions with commments and those comments might need ids.

Like if you have a `<For>` component with a list of A, B, C, D, and your first action is to swap C and D. You aren't touch A or B so you need to already have basically mapped the data to the nodes before performing this action.

This is interesting because we aren't hydrating. We don't get that one pass to line it all up. But I think we still need to so in order not to a wasteful action here we basically need to serialize something.

The most obvious approach would be reintroducing the `key` concept. It is serialization without forcing the whole object to be serializable. And then when a mapping Memo wakes up it just finds its nodes. This requires pretty specific code I admit and might basically force all optimal updates to lists through a specialized component. To be fair that isn't a problem for us as we have `<For>`. And the assumption is if you don't use that and use like `.map` instead you are basically recreating everything on change anyway.

I think the biggest question is whether these ranges need to be part of the core insert runtime or something we layer on in the components. But it is interesting that we do need to collect nodes in these cases on resuming before we do anything. Not a problem but something that needs to be understood.

## Optimization

I think the most obvious thing here is while it reduces bootup time by removing hydration, and it probably doesn't incur much cost server side as we aren't serializing extra things code size can be larger.

So most optimizations would be around removing what we know we don't need. Effectful statements that dont return a value and that don't read from reactive values. That `console.log` from the first example seems like an obvious cut... but if you client render it then it should be there. The solution is rather than remove it move it into the component export.

Similarly if we know that a Component will never be re-rendered on the client, the component export should be possible to be removed. Looking at the `props` example above you can see how chaining a few of those could remove code as not importing the `Counter` default export would not use the `Button` default export.

If you look the template elements are only referenced in the component exports so they disappear. For example our prop example looks like this if it were never client rendered:


```jsx
// client compilation
// Counter.jsx
register("###", () => writeScope(0, createSignal(0)));
register("###", () => ({
  get onClick() {
    const v = readScope(0);
    v[1](v[0]() + 1);
  },
  get children() {
    readScope(0)();
  }
}));

// Button.jsx
register("###", (tmpl) => writeScope(0, getNextElement(tmpl)));
register("###", () => {
  const v0 = readProps();
  const v1 = readScope(0);
  insert(v1, () => v0.children)
});
registerEvent("###", (...args) => readProps().onClick(...args));
```
Of course how would we know something is never client rendered.. Well if we combined this with Islands/Islands Routing then the top most Island is never client rendered. And unless a client component is used in an expression (like a ternary) or passed as a children or prop to another component well it can't be client rendered as well.

In our example our child component was top level and was only in the default export, but were it in an expression it would have been hoisted and its reference would have stayed.

So in a world where you could tell by the presence of certain things whether a component was a client component automatically you could apply further code cuts at a subcomponent level while leaving the code basically with the exact same development experience. The only serialization boundary would be the props on the topmost client component.

### *Could this mechanism be enough without any sort of Islands/Server Component architecture?*

Well, first thought that comes to mind is how we hydrate a typical application:

```jsx
import App from "./app";

hydrate(App, document.getElementById("root"));
```

What if the starting call didn't need to import the code to render, because it knew the App component could never re-render again.

```jsx
import "./app";

hydrate(document.getElementById("root"));
```
Well that means even without Islands/Server Components you are treeshaking out the "create" code (default export above) like the template that gets cloned etc... And this would cascade downward.

Pretend your `App` component looked like:
```jsx
function App() {
  return <html>
    <head>
      <MetaTags />
      <Scripts />
    </head>
    <body>
      <Nav />
      <Router />  
    </body>
  </html>
}
```

What could the treeshaken code look like for this file? Well not much:
```jsx
import "./MetaTags";
import "./Scripts";
import "./Nav";
import "./Router";
```
There are no dynamic expressions here, you didn't grab the default export. The only thing that could be here in addition is the props.

Maybe something like:
```jsx
register("###", () => ({}));
register("###", () => ({}));
register("###", () => ({}));
register("###", () => ({}));
```
But I mean possibly empty props could just default to empty object. In fact the only thing needed here is the props object.

The biggest benefit of Islands in addition would be to have a place to identify this is where you serialize the props, we don't need all the props all the way up. It's a code size optimization, another example of serialization by opt in.

Another would be that we know that anything passed from a Server component we can assume to be not rendered dynamically. This helps with tree-shaking.. as any Component that was in the props (including children) of another component could not be eliminated in the client case as we don't create props eagerly. However with Islands we need to do this, so it can be a much more aggressive cut.

Finally when considering after the fact navigation with Hybrid routinr knowing what not to render on the server is important as reading from Context API would be broken as the server would not possess the client state.


## Is this sort of insane?

Maybe, but through separation of problem space we arrive at this.

1. You can approximate resumability with minimal serialization by back tracing reactive deps you gather at server render time.

2. You can use static analysis to seperate imports in a way that is treeshakeable at a subcomponent level as long as you know at the top most entry point whether something will client re-render.

3. Using knowledge that the root is server-only we have exactly that sort of knowledge. So we can prune stateless components completely, stateful partially, and leave dynamic components.

4. If we combine these techniques with HTML partial router we have state preservation and the ability to deliver a client navigated experience.

5. As long as we denote what must stay on the server absolutely like data fetching/actions, and we know what must be on the client all of this could just be viewed as an optimization with the exact same DX as today's SSR'd SPAs.