---
# System prepended metadata

title: MetaData
lastmod: 2024-02-04
---

# Metadata

Just like CSS/Styles I feel like there are too many opinions here to just pick one and go. But I do think because of streaming etc, we need solutions that fit the base case in the core.

Some frameworks and core libraries have been looking at these solutions but I'm going to write up where I think I want to be right now.

There is one thing I want to acknowledge up front. Cascading systems don't work well in general. While sometimes components are descendents of others visibility changing can always mess with the order of siblings and there is little to no recourse there making sure that the order is correct. It's kind of like having reactive system writing to the same place. Last write tends to win. While a system in itself can try to make guareentees we shouldn't on a global level.

So what do we need? Well I think Svelte's solution is pretty reasonable. We just need that as a primitive.

## `useDocumentTitle`

```js
useDocumentTitle(() => "Some Title")
```

First, I want to call out that `<title>` is special. There can only be one (outside of `<svg>`, and don't get me started on those). But nothing stops you from inserting multiples and having them all ignored but the first. Also a lot of fun when considering SSR solutions that have varying entry points (some include the `head` and some don't).

So for SSR:
1. `<title>` tag in `<head>` is compiled to a seDocumentTitle call.
2. `useDocumentTitle` stores a value on sharedConfig.context that is read and inserted when SSR is flushed.
3. Last write wins.

For hydration
1. `useDocumentTitle` calls run but are ignored

For CSR:
1. `useDocumentTitle` runtime is essentially:
```js
function setDocumentTitle(fn) {
  createRenderEffect(() => document.title = fn())
}
```

So a library that wanted to manage title.. say with a `<Title>` component could just implement it as:

```js
function Title(props) {
  setDocumentTitle(() => props.children)
}
```
There is no cleanup behavior because it is difficult to know what should we set it back to. If a library wanted to do better deduping they would have a single `useDocumentTitle` call and have the library pre-process what is read in it.

## `useMetadata`

Similar to `useDocumentTitle` but it accepts an array of object definitions for metadata tags.

```js
useMetadata(() => [
  { tag: "metadata", props: {name:"example" content="whatever"}}
])
```

For SSR:
1. Similar to `useAssets` today this processes at flush time and inserts in the head. There is no deduping. However range for each call is wrapped in comment nodes with hydration key based on where `useMetadata` is called.

For Hydration:
1. Runs the expression storing it but does nothing if comment range is found in the head. If not it inserts it.

For CSR:
1. It metatags are realized and re-rendered on every update (function is reactive).
2. onCleanup the range of metatags is removed.

For libraries that would implement this and do deduping they'd only have a single `useMetadata` call and they'd do all their deduping in their code to trigger updates on it.

# Conclusion

That's it. Something like `@solidjs/meta` could be built with this. Or something like the pattern `Remix` or `Next` uses for their routers. People could add custom Svelte-like transforms to do similar stuff as well. But this would be a fairly small addition to the core to ensure that at a base these tags could be handled properly during SSR and streaming.

Today's solution with `useAssets` only covers one half of the problem and this should close the gap.