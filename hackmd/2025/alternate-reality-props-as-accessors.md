---
# System prepended metadata

title: Alternate Reality - Props as Accessors?
lastmod: 2025-07-23
---

# Alternate Reality - Props as Accessors?

Ok need to explore it. People talk about why we use Getters and honestly I'm not going to get into that again. Props shapes can be dynamic. But there is another way to get there without proxies. Making the props object itself an accessor. Not each prop.. but the `props` itself.

```js
function MyComp(props) {
  const upperName = createMemo(() => props().name.toUpperCase())
}
```

See with this sort of setup no proxies are needed if the whole props object swapped under it.

It is a bit cumbersome, but it has another funny impact. People can't destructure. I atleast not as a rest parameter. By simply making it a function it almost immediately discourages some awkward behavior. That being said I think merging/spreading still remain awkward. On one hand you might picture this:

```js

function MyComp(props) {
  const withDefaults = () => {...defaultValues, ...props()}
}
```
But getters are still important if you don't want all the reactivity to flow together. `withDefaults` would re-run when any of the props updated and would try to access every property causing premature render etc.. Rendering isn't the only concern though, any sort of processing would be impacted unless we memoized each prop and when you consider dynamic shapes.. not a win.

So compilation to getters is still the same as is the need for `mergeProps` and `splitProps`. In fact I don't think it makes sense for the accessor value to swap out on a whole pretty much ever, so really this is a cosmetic thing.

At which point I don't know. I think even if I had gone this path we would end up in the same place, except no one would be complaining about destructuring in the function definition. 