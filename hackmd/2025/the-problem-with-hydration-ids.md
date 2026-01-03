---
# System prepended metadata

title: The Problem with Hydration IDs
lastmod: 2025-05-14
---

# The Problem with Hydration IDs

Solid's use Hydration IDs drew some attention last year as they were the only thing that kept it from being the fastest SSR renderer. Solid was even quicker than the baseline implementations being tested against. The reason being that it could optimize escaping with the compiler in a way that dump template literals could not.

***So turn them off and win every benchmark?***

Well not exactly we need them to hydrate in the client.

And truthfully we need them for other things too. Fortunately it was only the serialization cost, not the generation cost that really slowed us down. But it would still be interesting to explore what to do about this topic in the future.

## The Case for Hydration IDs

Today in Solid they are used for 2 things:

1. Stable IDs for resource serialization.
2. Node matching for hydration.

### Stable IDs

That's right they are the basis for `createUniqueId` on the server. And to be fair React does something very similar. They also have tree-based heirarchical IDs to provide stable IDs.

This is important for the automatic serialization of `createResource`. Otherwise you'd need to provide a unique key or identifier. The only other way you could do this would be some compile time mechanism, as isomorphism (different transformation of the code on both sides) would prevent any sort of runtime mechanism working.

The challenge is if you were to say come up with something replaceable globally. Like `$UUID` it would need to be present at the call site. Like the following wouldn't work as it would produce the same ID:

```js
import { $UUID } from "solid-js/web";

function myReusableSerializable(value) {
  serialize($UUID, value);
}

myReusableSerializable("5");
myReusableSerializable("6");
```
You might be thinking you could be clever and like add a counter to it, but if order isn't stable (which is why you want this in the first place) that won't help you and you can end up with wrong collisions. Instead you need to do it like:

```js
import { $UUID } from "solid-js/web";

function myReusableSerializable(value, id) {
  serialize(id, value);
}

myReusableSerializable("5", $UUID);
myReusableSerializable("6", $UUID);
```

Which means that the consumption API needs to provide the option. Basically it is just a convenience for APIs that already demand unique ids. This way you don't have to think about what to name things.

Less than ideal but if serialization was opt in I could live with this.

```js
createAsync(() => fetchUser(props.id), {
  name: $UUID,
  serialize: true
});
```
But definitely a mechanism that works at runtime can hide these details short of a compiler going around augmenting `createAsync` calls.

### Matching for Hydration

Now this is where a lot of performance overhead is so alternatives could be welcome. The challenge is that Elements in our templating can be created out of order. In general JSX executes inside out. We don't know the parent element ever in our child components. We return our own markup and the parent attaches it.

In a VDOM library like React they can construct this whole structure and then perform actions so order doesn't matter. We don't have that privledge. There are only couple types of solutions I can think of. We either come up with a way to locate the elements where they sit in the DOM in a way that the client runtime can find them or we need to create a sort of Virtual DOM for ourselves. 

The locating with stable ids is definitely the most straightforward. If we were to try to not use IDs we'd probably need to serialize some sort of lookup but even then the order of those calls could matter. Honestly I think conceptually any solution here needs to convey the tree so in a sense hierarchical IDs are just the most compressed version of that information.

As for creating a VDOM ourselves our code isn't designed to handle one. I do have an idea for that. Using Proxies we can create our render tree during hydration and then when we attach it to real DOM nodes it can claim what is there. This is definitely a more expensive hydration approach (suggesting a Proxy per element server rendered) but it would have no impact on SSR performance.

A did quick sketch here which has multiple elements and a fragment as a proof of concept:

https://playground.solidjs.com/anonymous/933a1a78-5e2d-4967-b4cc-d17eda1156f5

## Why I'm talking about this Now

I was going to leave hydration until later but there is a problem I'm realizing for generating IDs. Consider something simple like:

```js
return <div>{condition() ? <Comp1 /> : <Comp2 /> }</div>
```

And for reference this is what it generates in the client for hydration (more or less):

```js
var _el$ = _$getNextElement(_tmpl$);
_$insert(_el$, () => {
  return _$memo(() => !!condition())() ?
    _$createComponent(Comp1, {}) : 
    _$createComponent(Comp2, {});
};
return _el$;
```
And this is what it generates on the server:

```js
_$ssr(["<div>", "</div>"], condition() ? 
  _$escape(_$createComponent(Comp1, {})) :      
  _$escape(_$createComponent(Comp2, {}))
);
```
First of all let's consider the difference between what Solid does today and what Solid could do in the future. Let's say `condition` is derived from something async. Like this showing different components based on whether a user is an admin or not.

Now I want you to notice that there are no reactive primitives in the SSR version.. Solid today doesn't even bother wrapping the condition in a function because it doesn't need to independently re-rerun. In Solid today we re-render components on the server as Suspense resolves. So even if the state of the condition changes (and impacts siblings after) the final state will be the same way the client expects it.

Still we do need stability for Async between runs so if say we make a new `createResource` call it can pick up the already created Promise. It is possible for a re-run of Suspense to re-run the component that creates the resource. So this is why we use hierarchical IDs. So assuming it is in the same location we can match it up during SSR.

And while imperfect it actually works pretty well using Components as the nested level. Like a `<Show>` component is fixed regardless of which path it goes so it registers as 1 and the next sibling can be 2.

However, if a conditional is a ternary like above might mess with things if the number of elements it returns differs as it would impact sibling. Luckily people generally aren't fetching resources really deep under a ton of conditionals in their apps as if those conditionals changed you would expect the stuff under them to be thrown away. And mechanisms like "Queries" give us caches to find the existing promise otherways.

### Finer than Components

I think it should be clear looking at this if we want a solution that can handle fine-grained pulling, components are to coarse grained to serve as depth.

So what is?

Well the ownership graph of Reactivity works pretty well because it is where all the decisions happen. It would be much deeper than components but if we aren't serializing it all over the place maybe that doesn't matter?

More so if we were ever to serialize our reactivity graph this would be part of it. If every node had an id, then the rest because pretty easy. This could unlock things like Resumability and easy serialization of any computation we felt was too expensive to re-run on the client at hydration time.

However, we now have a new problem. The graphs have to more or less be identical on both sides. And you can see from above they aren't.

```js
var _el$ = _$getNextElement(_tmpl$);
_$insert(_el$, () => {
  return _$memo(() => !!condition())() ?
    _$createComponent(Comp1, {}) : 
    _$createComponent(Comp2, {});
};
return _el$;
```
Right off the bat there is `insert` which is creating a render effect and there is an additional memo around the conditional which we didn't need either on the server. The renderEffect would cause an additional nesting level and the memo would offset the counter used in the other components.

Even if we added those what about this template:

```js
return (
  <div>
    <input disabled={disabled()} value={value()} />
    <h1 title={value()}>{value()}</h1>
  </div>
);
```
It becomes in the client:
```js
return (() => {
    var _el$ = _$getNextElement(_tmpl$),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.nextSibling;
    _$insert(_el$3, value);
    _$effect(_p$ => {
      var _v$ = disabled(),
        _v$2 = value();
      _v$ !== _p$.e && _$setProperty(_el$2, "disabled", _p$.e = _v$);
      _v$2 !== _p$.t && _$setAttribute(_el$3, "title", _p$.t = _v$2);
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    _$effect(() => _$setProperty(_el$2, "value", value()));
    return _el$;
  })();
```
So first expression is the value of the h1 getting inserted. The second is the attributes on both elements get set. And the last one is the value property of the input.

These are way out of order but intentionally so since we need to set value last (sometimes there are other attributes or even elements like "options" we want to process first) and we do it independently so it doesn't need equality checks. Other properties/attributes are grouped and we handle inserts seperately.

Whereas for SSR we generate this with wrapping expressions in functions:
```js
const tmpl = ["<div><input", "><h1", ">", "</h1></div>"];

return _$ssr(
  tmpl,
  () => _$ssrAttribute("disabled", disabled(), true) + 
    _$ssrAttribute("value", _$escape(value(), true), false),
  () => _$ssrAttribute("title", _$escape(value(), true), false),
  () =>_$escape(value())
);
```
The grouping is by order not by behavior. How could these be done efficiently with the same graph shape?

Maybe something like:

```js
const tmpl = ["<div><input", "><h1", ">", "</h1></div>"];

return (() => {
  var result = "";
  var c1 = $resolve(() => $escape(value());
  var c2 = $resolve([
    () => _$ssrAttribute("disabled", disabled(), true),
    () => _$ssrAttribute("title", _$escape(value(), true)
  ]);
  var c3 = $resolve(() => _$ssrAttribute("value", _$escape(value(), true), false))
  return $ssr(tmpl[0], c2[0], c3, tmpl[1], c2[1], tmpl[2], c3);
})();
```
Each `resolve` call would create a new owner in that order and would attempt to flatten their expression. If they hit something async they return NotReadyError which `$ssr` knows how to handle and creates the returned template object.

Honestly I don't know if performance would be that much worse but I suppose it is worth a shot. It is interesting that in a sense the SSR renderer would be able to group things almost identical to the client/universal renderers and it would just be the final output that would be different.

That being said `isServer` becomes even more dangerous because previously it only really messed with resources but now it can't wrap any reactive statement unless you know you are creating the same on both sides.

## Conclusion

So going back to the beginning if we wanted to keep hydration IDs for serialization (case 1), and remove them for template matching(case 2) there is potential for a solution here. It just is perhaps less performant on both sides. We sacrifice Hydration performance for removing serialization cost of Hydration IDs, and we sacrifice server rendering performance to get better Stable IDs. 

I would say both solutions are probably more sound than their predecessors. Just funny that they are almost nulling out each others performance benefit. But like anything else, we won't know until we test it.