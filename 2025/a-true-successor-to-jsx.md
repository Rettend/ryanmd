---
# System prepended metadata

title: A True Successor to JSX
lastmod: 2025-10-01
---

# A True Successor to JSX

I love the idea of Ripple's templating. Nested statements and the ability to analyze native control flow gives this power that seems incredible.

I started thinking is there a way this could be done while being backwards compatible with current JSX. As in yes new features and new extension but you could copy and paste any existing JSX code and it would work. More so keep JSX's semantic-less stance to allow for different compile outputs. In fact a goal would be to have it work with React. Might not do the implementation but it should work for anything.

What this starts with is identifying JSXs shortcomings. And to me that comes down to the fact we only have expressions. We need to be able to make multi-line expressions or something similr to do expressions. https://github.com/tc39/proposal-do-expressions

Now Do expressions are pretty much dead as a proposal. But it would be interesting to re-introduce them in 2 new ways.

### Expression Scope in Templating

What if by using a delimiter on `{}` you could express that instead of a normal expression in your template it is a 'do' expression. Like pretend we used `@{}`:

```jsx
<ul>@{
  for (const item in items()) {
    <li>
      <Item item={item} /
    </li>
  }
}</ul>
```

Or
```jsx
<div>@{
  if (x) {
    <span>x is truthy</span>
  } else {
    <span>x is falsy</span>
  }
}</div>
```

### Function Level

We denote a function level syntax by using the `component` identifier:

```jsx
component MyComp(props) {
  if (props.x) {
    <span>x is truthy</span>
  } else {
    <span>x is falsy</span>
  }
}
```
Is that an early return, well not really but because the fact it comes down to the last statement means block level native control flow can be analyzed appropriately. Basically by grammar since there is one return at the end early returns aren't a thing.


## Benefits

The reason this all is interesting is because of the use of native control flow. Which is analyzable. Presumably Solid or the like wouldn't need `<Show>` or `<For>` components and just compile that down to fine-grained updates. Unlike a `.map` function it is analyzable. Similar to how we already do special treatment on ternaries and boolean expressions inside JSX we could do this transform inside these expressions or Components. You wouldn't need to worry about wrapping a ternary in a fragment to return it top level.

The nested scopes are also great for refactorability. I suppose though they wouldn't be too helpful for React as they can't handle nested state, but it is interesting none the less. Signals libraries could keep their independent updates with the ability to co-locate logic even better.

```js
component MyComp(props) {
  if (props.x) {
    const [count, setCount] = createSignal(0);
    <button onClick={() => setCount(c => c + 1)}>{count()}</button>
  } else {
    <span>x is falsy</span>
  }
}
```

## Is this feasible?

### Limitations

Well it starts with are `do` expressions feasible? The reason things are this way is to keep JSX the same. Ie.. `div` is still a HTMLDivElement or VNode or whatever:

```jsx
component MyComp(props) {
  const v = <div>Hello</div>
  console.log(v)
  return v
}
```
And text interpolation is still the same.

But `do` expressions do have limitations. But perhaps with this narrow scope we can set some rules that won't break the JS parser. Basically what we want an implicit return. And for loops to return arrays.

To make this work we need to identify which current JS grammar isn't allowed:

1. Early returns. Basically that would error at compiler time. These blocks must only have a single return at the end. Or no return as it is implicit.
2. Declarations. It is possible we could just pass them through, but my gut is since they can be chained trying to like choose to return them all or only the last is odd. It also reads weird.

Classically do expressions don't support conditionals without `else` or declarations but I don't think that is a problem here. A condition without an else returns `void`.

### Implementation

The easiest would be to keep the grammar legal JavaScript and just have some additional compiler errors on limits. Then we could transform control flow into user provided methods. Similar to how JSX has a factory function. We could ask for one for loops and one for conditionals and just map all grammars to those.

By handling the control flow transformation and the implicit returns at the transform level instead of the parser level might make things simpler. Beyond that to get TS working should be not incredibly difficult as the TS we produce after transforms should have the right types.. Ie.. we add in the returns etc...

So basically the hope is to reuse most of the tooling that exists and just slightly augment it for our new file extension.

## Last Thoughts

This might still be too weird.. Like implicit returns etc.. The way Ripple works is it collects any nodes so it doesn't care how you end the block. Of course this means no assignment to variables. But maybe that is a good thing? We don't like children introspection anyway. Better for SSR since we aren't conceptually returning things. `for` loops are faster than `.map` so to speak.

But if the goal is to make it easy to migrate off React and maybe even give a bit back to the ecosystem in the process this seems like the way to go. Just what to call it?

[ReactiveScript](https://dev.to/this-is-learning/the-quest-for-reactivescript-3ka3)? It isn't the ReactiveScript I originally imagined, but maybe `.rsx` or `.rxs` has a ring to it? Nothing really reactive about it to be honest, but I can't think of a clever way to market it.