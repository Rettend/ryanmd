---
# System prepended metadata

title: Partially Lazy Reactivity
lastmod: 2024-03-24
---

# Partially Lazy Reactivity

The thing is being fully lazy is at odds with what I think directionally we should be doing Signals. The conflict comes down to Async. Lazy makes it impossible to be blocking without possibly introducing waterfalls.

Why do I think blocking async is good? Well it is easier for people to reason about if you don't add a time dimension. It also moves people away from "guarding" authoring. That is checking like `isNull` or `isLoading` around anything they want to read.  "Guarding" is bad as it isn't condusive to refactoring. If something becomes async later and you weren't guarding well now you have a crashing bug.

Also, I've come to realize is Solid's eager approach saved us from a lot of headaches. Mostly it ensured pure computations executed before effect for the most part. This is something I want to keep but it's harder in a lazy reactive system. It is a nice property because it means that the pure part is free to re-calculate as needed without causing any side effects. We won't be in the middle of effects and then realize something has to change which can cause tearing. And more than momentary tearing if it is async.

## Pure Sinks

```js
createEffect(
  (prevPure) => {
    // tracking/no writes
    return someSignal()
  },
  (pure) => {
    // non-tracking
    return doEffect(pure)  
  }
)
```

What you need is pure sinks. Which is a big ask I think. People draw a comparison to React dependency arrays and they should. When you system if fully lazy(pull) that's the best option you have. A reactive system can be a bit smarter because we have dynamic runtime dependencies but the fundamentals are the same.

In a sense it is getting our eager behavior back just scoped to what is actually subscribed to. We always run the pure/tracking part on update before we run the effects, and if detect anything to suggest it shouldn't continue we don't run the effects.

## Scheduling

In so we are talking about a 3 pass execution schedule. This whole thing still be triggered synchronously or via microtask batching, but once it is time to run there are 3 queues.

#### 1. Pure Queue

This should contain all `createAsync`, and pure parts of`createRenderEffect`, and `createEffect`. It is arguable whether eager Async should be in the same queue but I don't think it matters the order here. If it is read before executed, it just won't execute again.

#### 2. Render Queue

This is all the effects designated as render effects. 

#### 3. Post-Render Queue

This is the rest of the effects.

### Pure Queue - Handling Suspense Fallbacks

If during a pure effect call we realize there is waiting async we bail out of executing the actual effects. However, we don't want to lose those effects, and we need a way of knowing when the pure computations have settled. The simplest mechanism is to register them with the flushboundary(Suspense Boundary) and on any resolution remove any settled nodes, and then check the length. If it is empty consider things settled and now run the effectful part of the effects.

Additional changes may end up queuing more things, including the same effects again. It may be cheap enough to just consider keeping on appending to the list and counting on the dirty state here to just short circuit execution.

`renderEffects` tend to run immediately on initial render. We could if desired only hold off end user effects on a whole.. and run any `renderEffect`'s that can be run (ie not directly blocked by async). This might lead to extra work being done off screen but it could also pre-emptively accomplish more of the rendering. However, With concurrent rendering rendering any effects while unsettled is not an option so it may be simpler to keep the behavior consistent.

`effects` outside of the impacted Suspense boundary are not impacted so this is very much a ownership problem space.

### Pure Queue - Handling Concurrency

Transitions are a bit more complicated in that they are almost the opposite in terms of scoping. A Suspense boundary may allow certain things to opt out of a Transition and it takes responsibility, but anything that is not caught ends up in this more global thing.

If a Transition is active and we inact a change that whole section of the graph needs to be registered (and forked) with the Transition (including effects to get the pure references) and any async read not captured by Suspense (ie.. existing Suspense boundaries don't go to fallback under Transition) needs to be registered as well.

When we go to flush since those changes are not part of the graph you might not think much impact, but if a change would impact a node that is also in the Transition we need to apply the change in both places as it executes which could queue more work for the Transition. V1's synchronous execution and global queue helped differentiate effects a bit better here, but now this needs to consider scheduling as well.

## Revisiting Rendering

### 1. Simple attributes/props:

```jsx
createRenderEffect(count, v => _$setAttribute(_el$, "title", v))
```

### 2. Grouped attributes/props:

This wants previous input last time effectful side ran:
```jsx
createRenderEffect(
  () => ({a: count(),b: count2()}),
  ({ a, b }, p = {}) => {
    a !== p.a && _$setAttribute(_el$, "title", a);
    b !== p.b && _$setAttribute(_el$, "other", b);
  }
)
```

### 3. Insert

This naturally wants previous output for diffing, but maybe if we normalize upfront that changes? A question that should be asked is if normalization can happen on the pure side?  Maybe we can get rid of "onioning" altogether?

"onioning" was a term I came up with with to describe a reverse unwrapping that would happen with chains of signals returning signals (or accessors) We needed to potentially wrap these at each level coming back when siblings could be involved (like in Fragments). But in Solid 1.7 we basically forbid this with TS. And other reactive renderers I don't think have as foolproof safeguards. Honestly my original position was because I wanted to handle anything people through at it. Over time we've reduced a lot of code complexity here because we started making certain things unacceptable. Can we tighten expectations a little more and just get rid of this altogether?

We actually didn't always have this. Originally we handled fragments in the DOM. But changing to arrays simplified the DOM processing significantly which improved performance for people not using fragments. I also believe our move away from DOM fragments is what makes the universal renderer possible in Solid. Since other than native elements we don't use the DOM. So these were good things and now we have to contend with consequences.

In general advantage here of pulling out normalization is that it moves all node creation to the pure part. Which is odd because creation isn't really pure. But it means that we take the perspective that something is only effectful if it writes to/inserts into something. This allows a lot more flexibility with things like concurrent rendering. It also makes hydration interesting. As it seperates the definitely skippable work (effects) from the matching (reconstructing of state). It atleast suggests that serialization is possible.

So what I'm saying is all these decisions move us to a position where we have a true alternative to the Virtual DOM. Where we keep many of the benefits but apply them in a way that is extensible outside of rendering.

#### Examples

Direct line unwrapping is probably fine as it should be memo in memo etc.. Where things get complicated is nesting with Fragments.

Basic inserts aren't too bad:
```jsx
function Comp1() {
  return (<>
    <Comp2><span /></Comp2>
    <div />
  </>)
}

function Comp2() {
  const [signal] = createSignal();
  return (<>
    {props.children}
    {signal()}
  </>)
}

// becomes    
function Comp1() {
  return [createComponent(Comp2, {
    get children() {
      return _tmpl$();
    }
  }), _tmpl$2()];
}
function Comp2() {
  const [signal] = createSignal();
  return [_$memo(() => props.children), _$memo(signal)];
}
insert(parent, createComponent(Comp1, {}));
```
You end up with an array here of an array of 2 functions and then a div. Calling the functions will always result in the same Span because it is memoized. But what about with control flow?

```jsx
function Comp1() {
  const [signal] = createSignal();
  return (<>
    <Comp2>{signal() ? <span /> : undefined }</Comp2>
    <div />
  </>)
}

function Comp2() {
  const [signal] = createSignal();
  return (<>
    {signal() ? props.children : undefined}
  </>)
}

// becomes
function Comp1() {
  const [signal] = createSignal(true);
  return [_$createComponent(Comp2, {
    get children() {
      return _$memo(() => !!signal())() ? _tmpl$2() : undefined;
    }
  }), _tmpl$()];
}
function Comp2(props) {
  const [signal] = createSignal(true);
  return _$memo(() => _$memo(() => !!signal())() ? props.children : undefined);
}
```
*(This is what I think it should be, I actually found a bug in Solid's current transform I think with member expressions in fragments)*

Well for simple control flow isolation of condition means that only on a conditional change will the whole expression re-run. And I think theoretically this is sound as any condition would be grouped and only re-eval if the whole expression changes ie:

```jsx
a() || b() ? <Comp /> : undefined
// becomes
_$memo(() => !!(a() || b()))() ? <Comp /> : undefined
```

The idea here in general is if we guard(memo) all conditions and memo all potentially reactive sibliings we shouldn't over run. Does this fall apart anywhere?

Well, let's think about this. Top level fragments will never be a problem as even when composed you have isolated expressions. It's when we have expressions in expressions maybe. Component props come to mind. We don't memoize those and we basically run them on access. Still seems fine because they will be consumed somewhere in isolation.

So it really comes down to how normalize the arrays. We need to run the whole expression down. Which means we access every expression. If any expression/part updates we need to run the whole thing again and it shouldn't do unnecessary work.

#### Refactoring Insert (simplified)

Let's go through the exercise here of trying to pull out normalization.

```jsx
function insert(parent, accessor, marker, current) {
  if (marker !== undefined && !current) current = [];
  if (typeof accessor !== "function") return insertExpression(parent, accessor, current, marker);
  createRenderEffect(prev => normalize(accessor, prev), (value, prev) => insertExpression(parent, value, prev, marker), current);
}

function normalize(value, prev) {
    while (typeof value === "function") value = value();
    if (Array.isArray(value)) {
      const normalized = [];
      normalizeArray(normalized, value, prev);
      return normalized;
    }
    return value;
}

function normalizeArray(normalized, array, current) {
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i],
      prev = current && current[normalized.length],
      t;
    if (item == null || item === true || item === false) {
      // matches null, undefined, true or false
      // skip
    } else if ((t = typeof item) === "object" && item.nodeType) {
      normalized.push(item);
    } else if (Array.isArray(item)) {
      normalizeArray(normalized, item, prev);
    } else if (t === "function") {
      while (typeof item === "function") item = item();
      normalizeArray(
        normalized,
        Array.isArray(item) ? item : [item],
        Array.isArray(prev) ? prev : [prev]
      );
    } else {
      const value = String(item);
      // mostly for hydration matching
      if (prev && prev.nodeType === 3 && prev.data === value) normalized.push(prev);
      else normalized.push(document.createTextNode(value));
    }
  }
}

function insertExpression(parent, value, prev, marker) {
  if (value === prev) return;
  const t = typeof value;

  if (t === "string" || t === "number") {
    // set textContent
  } else if (value == null || t === "boolean") {
    // remove children
  } else if (Array.isArray(value)) {
    // reconcile arrays
  } else if (value.nodeType) {
    // remove children
    // replace with node
  }
}
```
This is mostly unchanged from what's there. I suppose we could pass the type information from normalization into the insert itself but it is a relatively cheap check and probably not worth the space. So this doesn't look to be much of an issue if we can freely access all functions at the same reactive scope.

One inefficiency that is obvious here is the creation of extra textNodes as the matching during normalization will not work in a lot of cases. We do have a saving heuristic but its pretty limited. This can't be addressed easily without doing textNode hijacking during reconciling. This is something that Surplus actually did. Solid is like this today so it isn't mission critical but would this accent it more?

Keep in mind once you hit a real DOM node all this stops. This complication is really all to handle arrays/fragments. But I think overall it is sound.

This logic also is likely the base of the `children` helper. I think with pulling out normalization become basically the same thing.

## Other Thoughts

### Accessor Identity

While I dislike people checking for `isSignal` and I think it is terrible from an API standpoint as it goes against locality of thinking, I will concede that it can be used as a performance optimization.

A computation derived from a single source is equal to just using the source directly (with exception to overrides on equality checks):
```
(B <= A)  === (B = A)
```
You see it above a bunch when we do something like `_$memo(signal)`. The compiler already knows to pass it directly in. So if our core accessors did contain a symbol on it that could be detected. Any `createMemo` call could be shortcutted to just return the input accessor. This admittedly could fail to properly detect in places but it is just a slight optimization.

### Revisiting Old Decisions

I made most of my decisions with Solid in this area in the 2018-2019 period. I had a very different outlook compared to today. I honestly wasn't sure things would work and just hacked at it until they did. It was not a structured exploration like this is now. So it is a good time to rewrite this stuff.

One consequence of a lot the decisions I want to make here though is to simplify the logic by removing some of the safeties to make things more optimal and more predictable, but I do fear this might have negative consequences on the No Build side of things. We can rely on the compiler in our JSX to produce the right output but people manually doing stuff may need to be even more vigilant.

I'm ok with this in general. There are additional safeguards we could make by design for the No Build side of things like component execution isolation, ie.. `<div>` returns a function you must execute to get an `HTMLDivElement` back. But its hard to give up the immediacy we get with Solid.

### `isLoading` as a `try/catch`

With a throw based system it is possible to write isLoading as an expression statement instead of putting it on the node. Similar to like `untrack`. In general `untrack` is much more powerful than `peek` and I believe this would be as well. Consider something like:

```jsx
function isLoading(fn) {
  try {
    fn();
  } catch(node) {
    // check if thrown value is a reactive node
    return true
  }
  return false
}
```

Then you could basically ask `isLoading` of any expression in a safe way that won't trigger Suspense. Well not triggering Suspense might require some other global manipulation, but the gist is the basically same.

```js
const loading = ()  => isLoading(() => users() && posts())
```

To be fair using Suspense is probably better for simple cases but it is pretty powerful tester/guard. And it would be reactive since it still reads from the sourve that throws.

`getLatest` could also be implemented similarly but return the `fn` return value or `node.value` assuming the expression it wrapped was a reactive accessor. It's possible or for some condition to throw and not have the desired outcome if it isn't caught by parent node itself.

### Cleanup

This wasn't obvious at first but there is a difference in timing with concurrency. Like you might run the front half multiple times independent of the back half. In so the front and the back need separate cleanup cycles. If we are pulling creation to the front half then really the only cleanup we need to worry about on the back half could be limited to perhaps the return function from the effect? We aren't using returns for anything else so maybe that is the solution.

The question then becomes should we even restore reactive ownership during side effects.. Maybe not.