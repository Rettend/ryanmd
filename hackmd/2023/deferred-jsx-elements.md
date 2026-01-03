---
# System prepended metadata

title: Deferred JSX Elements
lastmod: 2023-08-20
---

# Deferred JSX Elements

## Problem Statement

Recently due to SSR Hydration mismatch Solid has been seeing a few issues around people doing checks like `props.icon ? props.icon : <Default />`. The reason is that Solid SSR processes the order of props differently. But this is a problem even without considering SSR.

Solid Components basically compile to function calls(`<MyComp />` becomes `MyComp()`), and props use `getters`. 
```jsx
MyComp({
  get icon() {
    return Icon()
  }
})
```

So when you do `props.icon` twice you are creating and running all the code twice. If that was something more significant you'd be creating that whole part of the reactive graph and all the DOM nodes twice!

This is never desired which is why I never designed for this case. If you are going to access expensive things twice you should wrap that in a `createMemo`. Solid has a special `createMemo` that unwraps children called `children` made specifically for the case of child introspection, but for simple cases like this `createMemo` would be sufficient.

Why don't we just do this automatically? Well it would be expensive. It suggests wrapping every dynamic prop at every component in a memo. It is largely unnecessary. We probably wouldn't do it at a compiler level since we couldn't know whether we'd need to memoize in all cases, and at runtime we don't know what we have until we have it.. it is too late.

Ok, but this sort of requires knowledge of what is going to be passed in etc, or component authors will likely overwrap. I agree, which is why this is a problem. How big of a problem though is debatable.

## Simple Solutions (available currently)

Don't access the value twice. You have 3 options:

1. Wrap in createMemo.
2. Assign to a temporary variable so it doesn't get accessed twice.
3. Use the `in` operator as that doesn't access the value.

We've already talked about wrapping in a memo. But in Solid this has a greater impact as generally you do this by hoisting. Consider Context:

```jsx
function MyComp(props) {
  // now this owned in this context instead of where it is inserted
  const icon = createMemo(() => props.icon);
  return <SomeProvider>
    {icon() ? icon() : null}
  </SomeProvider>

}
```

Assigning a temporary variable can be done easy without hoisting to maintain context but it is a bit awkward when you consider that you only have expressions in JSX.

```jsx
let tmp;

return <>{(tmp = props.icon) ? tmp : <Default />}</>
```
I mean you could hoist the whole thing as well:
```jsx
const icon = () => {
  const i = props.icon;
  return i ? i : <Default />
}

return <>{icon()}</>
```
But this isn't the most convenient.

This leaves using the `in` operator which works actually pretty well except `in` tests the existance of a property so it isn't good for things that toggle between present and not present as in those cases the property is always defined.

## Alternate JSX Compilation

### *What if we compiled JSX Elements to `.bind` instead of `.call`?*

What I mean by that is that what if JSX didn't become DOM elements or Components get called until they are inserted or passed to a `render` function?

The first obvious implication is that this would no longer be true:

```jsx
const div: HTMLElement = <div / >;
```

But the other implication is that this would be fine:
```jsx
render(<App />, mountEl)
```
Notice that it is not wrapped in a function as nothing gets processed until `render` does its internals.

This means that JSX could be passed around without function wrappers very easily. In fact direct usage wouldn't be identified as being needed to be wrapped in a `getter`.

```jsx
<MyComp icon={<Icon />} />

// becomes
createComponent(MyComp, {
  icon: createComponent(Icon, {})
})
```

However, recognize this doesn't reduce the number of wrappers as the create call itself would be returning a function(probably with a special symbol).

Also in the case of native element there now is an extra wrapper on template boundaries. It isn't per element but per block.

And also in the case of reactive expressions we are also creating another wrapper.

```jsx
<MyComp icon={count() > 5 && <Icon />} />

// becomes
createComponent(MyComp, {
  get icon() {
    const c = createMemo(() => !!(count() > 5))
    return c() && createComponent(Icon, {})
  }
})
```

Because even with lazy Element creation, reactive expressions still need to be ran lazily and expressions need to be memoized that could lead to expensive work as, if count is bigger than 5... you don't want to recreate the component every time it increments to 6, 7, 8, 9, etc... So in no way does this remove the need for lazy wrappers.