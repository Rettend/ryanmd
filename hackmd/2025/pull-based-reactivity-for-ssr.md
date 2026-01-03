---
# System prepended metadata

title: Pull Based Reactivity for SSR
lastmod: 2025-04-13
---

# Pull Based Reactivity for SSR

The idea here is that we can avoid component re-renders during SSR by re-pulling the results as async resolves. The idea is simple but there are some reprocussions to such a system. Let's look at the designing how this can work.

This starts with a few considerations:

1. Nothing but async state can change during SSR. There is no notification (push-based) reactivity here. So if a value would be set it has to be during initial render. Since events and effects don't run during SSR and you shouldn't be "writing" during the pure part this should be fine.

2. We need to keep a careful watch on performance. Not collapsing into strings seems to have negative implications on performance. Our pure string approach appears to be the biggest difference with Solid say from Svelte or others.

## Looking at the SSR Template Function

Right it resembles a tagged template literal and it goes through stitching strings with the holes which can be:
* strings/numbers
* functions (ie reactive values)
* objects with `t` which signifies an already processed template string
* arrays of other valid values

And we ensure that that all becomes an object with `t` which carries the string. Solid today doesn't even really compile to functions for these native templates because they run every render (like React!) so we have for the most part just jamming strings into objects which then jam into strings as we compress up.

Why objects? Well to prevent double escaping. Escaping assumes these are processed and that was the easiest way. As it turns out not compressing as we go is slower. Ie if we keep our objects around a long time and then compress them to strings at the end we become as slow as other solutions.

So unsure if we have many options with async. We will need to see if string replacement is faster than objects. Because with async you can't melt everything into a string without atleast markers.

Concept here is we compress the best we can but then rerun any remaining holes when async completes. As we run our SSR method we try/catch each hole. If it throws not ready we can't flatten to a string and return a template with:
* Resolved strings with breaks for remaining holes.
* Hole functions to rerun
* The ownership context for this template
* Collected Promises

Parent templates may come across children in this state. They too can flatten best they can, combining resolved values and templates, hole functions, and waiting promises. However they won't try to rerun incoming hole functions from unresolved templates.

This combining suggests that holes may need to keep their own owner reference because once combined adjacent holes may need to run in different contexts.

The responsibility of re-running these holes will fall to Suspense and top level. Effectively(psuedo code):

```js
while (true) {
  await Promise.all(template.promises);
  let result = [template.part[0]];
  const promises = [];
  const holes = [];
  for (let i = 0; i < template.holes.length; i++) {
    const fn = template.holes[i];
    try {
      const ret = resolveSSRNode(runWithOwner(fn.owner, fn));
      result[result.length - 1] += ret.part[0];
      // not resolved yet - merge
      if (ret.holes?.length) {
        result.push(...ret.parts.slice(1));
        holes.push(...ret.holes);
        promises.push(...ret.promises);
      }
      result[result.length - 1] += template.part[i + 1];
    } catch (err) {
      if (!(err instanceOf NotReadyError)) throw err;
      // hit async error itself create hole
      holes.push(fn);
      promises.push(err.promise);
      result.push(template.part[i + 1]);
    }
  }
  if (!holes.length) return result[0];
  template = {
    parts: result,
    holes,
    promises
  }
}
```

I mean it is pretty cool that all SSR will basically fall into a `while(true)` type of loop.

## What About Suspense?

Well Suspense returns the fallback without returning a template with holes unless the fallback itself has holes. So this means that the parent can full resolve and flush.

This means that Suspense boundaries do still need independent registration so that when they complete they can flush themselves as well as potentially if they finish before other elements of their parents do string replace.

So in a lot of ways things aren't that different than they are today for the server rendering part. Hydration, hmm... that is a different question but one thing at a time.

## Performance

One thing that could be worth trying is not keeping what I call the parts above in an array but instead put them all in a string with some sort of noise marker. And then do string replaces at resolve time. I suspect that won't be as performant but we do have to look at object allocation.

Like in the real code `part` wouldn't be an array if it was only a single string and we'd be upgrading it to arrays as needed. We might also need to look at monomorphism in terms of shape of these template nodes. They are sort of VDOM nodes admittedly but more Block DOM then individual and only when things can't be resolved initially.

It is also possible the whole compress as you go might not be worth it in real async scenarios. The problem is I'm not sure we'd ever be able to tell because async already adds more delay then we'd capture in the typically tight cycle SSR benchmarks, and those being synchronous would always benefit from early evaluation.

## Conclusion

Well, anyway that is basically the thought for now. Nothing really too complicated. Nor did I anticipate it would be. The problems all come when we start looking at hydration. Timing is critical if we want to figure out how to drop hydration IDs, but given things like `createUniqueID` and async serialization we will probably be generating them anyway even if we don't write them into the DOM. So there may still be complications in terms of server rendering performance to consider but I did confirm it was the HTML output causing the bigger slow down. That being none of this overhead is that big compared to actual work needed in user code to actually present the data to render the page.


