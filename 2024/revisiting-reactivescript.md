---
# System prepended metadata

title: Revisiting ReactiveScript
lastmod: 2024-12-04
---

# Revisiting ReactiveScript

Compilers have gotten a lot of attention of late which got to look back at one of my earlier ideas. Before the React compiler. Before Svelte Runes. I had an idea of a designing a [reactive language](https://dev.to/this-is-learning/the-quest-for-reactivescript-3ka3). there were always glaring issues with it. I put it to the community to solve it but we had limited success.

I realized only after seeing what Svelte was willing to sacrifice moving to Svelte 5 from Svelte 4 that perhaps the problem was my goal was too ambitious. For all the awkwardness that comes with JavaScript APIs. For all the clunkiness there are good things we get from those explicit APIs that you don't get with simple language. If Svelte the poster child for lets make things look easy was willing to abandon `let` then perhaps the goal is much more reachable.

## Why Build a Reactive Language?

JavaScript does most of what we need. The biggest reason to entertain a language feature in my mind is strictness. Not purely ergonomics. Although that is often a benefit.

The biggest challenge with building a language as shown in the previous article is managing the boundaries. More specifically boundaries of reactivity. These boundaries exist unless you could do cross file compilation which could be costly. React's compiler boundaries focus on Components but I feel that is really restrictive. At one point I was thinking a type system but that too might be prohibitive.

So maybe we just need to hone in on what we are trying to solve. And for me that is two things:

1. Signals vs Stores
2. Read vs Write

They are about as fundamental as it gets. The first exists because we can't intercept a primitive value access in JavaScript. The second is that we need to control data flow and mutable interfaces especially deeply reactive, do not.

Everyone assumes the first thing I'd solve with a compiler is destructuring props, but that hides the tracking semantics. Tracking is important to understanding. If we forget about magic of trying to hide tracking scopes can we accomplish this in a simple way?  

## Introducing State

Now what I show you will look a lot like Svelte Runes but it is an approach that I call Function decoration that I first came across while working on Marko 6 and the "ref" sugar proposal from Vue that predates Runes by a couple years.

```js
let state = $signal(0)

state = 5;
state++;
```

And this would roughly compile to:
```js
const [state, setState] = createSignal(0);

setState(5);
setState(s => s + 1);
```
Not the use of the function form for the second update transform because we want the self reference to be `untrack`d.

Nothing amazing yet but what if we could also do this automatically:

```js
let state = $signal({ count: 0 })

state.count = 5;
state.count++;
```
Becomes:
```js
const [state, setState] = createStore({ count: 0 });

setState(s => s.count = 5);
setState(s => s.count++);
```
> Note: Solid's Stores today don't default to mutable setters but that is something that is slated to change in the future. I will be using mutable setters 

Again the function form means the self reference is untracked.

Now how could we possibly determine which we needed? Well it comes down to if we can determine if nested properties are ever written to in the state variable.

This is challenging if you can pass the ability to write around as it could be written in other files. But maybe we don't need to.

The whole reason Solid has read write segregation is to try to discourage that. What if you can only write to state in scope? Ie something that could be completely statically analyzed within a single file.

Well first off it doesn't mean things can't be updated from outside:

```js
let state = $signal({ count: 0 })

return (
  <Button onClick={() => state.count++}>
    The Count is {state.count}
  </Button>
)
```
It means that all the ways to update that state need to be exported functions. In fact in Solid I encourage a Store pattern that looks like:

```js
function StoreProvider(props) {
  const [store, setStore] = createStore({ count: 0 });
  const increment = () => setCount(s => s.count++);
  const decrement = () => setCount(s => s.count--); 
  
  return (
    <Store.Provider
      value={[count, { increment, decrement }]}
    >
      {props.children}
    </Store.Provider>
  );
}
```

Instead of exporting the setter you export the action.

The implications of this restriction though of only being able to mutate within scope though is profound. It enforces read-write segregation outside in a way that isn't possible today.

## The Challenge

I have talked at length about this before. The problem is how to identify reactivity coming in and out of scope. Sure with props into JSX we can be content with always resolve our accessor to a function call or property access and then Solid's JSX compiler knows what to do. But what about primitive composition.

What if I wanted to create my Store above in a seperate scope:

```js
export function createStore() {
  let state = $signal({ count: 0 });
  const increment = () => state.count++;
  const decrement = () => state.count--;
  return [state, { increment, decrement }] 
}
```

Now for a proxy this would work perfectly fine to be used like:
```js
const [state, { increment, decrement }] = createStore();
```
But what about a primitive value:
```js
export function createStore() {
  let count = $signal(0);
  const increment = () => count++;
  const decrement = () => count--;
  return [count, { increment, decrement }] 
}
```

A naive transformation here would transform the `count` in the `return` to `count()` but we need the reactivity to transfer. One option is to wrap it in a function, but then we are no better than where we are today. In fact I'd say we are worse because you have a 3rd category of reactive variable now.

Now one thing we could do is look to see if it could be tracked. Like if we see a top level variable access outside of a function not call it. But that messes with tracking scopes and can lead to a bit of a can of worms. Like how do you transform:

```js
export function createStore() {
  let count = $signal(0);
  let doubleCount = count * 2;
  return doubleCount;
}
```
Maybe:
```js
export function createStore() {
  let [count, setCount] = createSignal(0);
  let doubleCount = () => count() * 2;
  return doubleCount;
}
```

Even if we pretend that it automaticaly wraps all the expressions. How does the caller know that it has a reactive value. The types say `number` and it returns a function.

We could make our own `$` function. Ie name it `$store` instead of `createStore` and have the compiler automatically handle the descrepancy but what if the shape of the return isn't just reactive state? What if it returns those action functions, or multiple state variables in an array?

The answer is you can't. So we really have only one option. Restrict what can be returned from dollar sign functions.

## Designing the Compiler

### Primitive Composition

For the compiler `$` can be a mechanism to identify a function that either returns a single value or an array. You can make it required that if it is an array it must be destructured. In so then the compiler can identify which type it is dealing with:

```js
// readonly
const store = $myStore();

// has write methods
const [store, updateStore] = $myStore();
```
TypeScript will play along since you are returning either a reactive value or you are returning an array where the first index is a reactive value.

`$signal` is special as it is the only primitive that return can be directly mutated. This does mean that you will still be using a lot of setter functions when composing reactivity but local state will be kept simple.

It might be tempting to have `$signal` optionally support the array syntax. However it is difficult to reconcile the difference between mutable and immutable change in the setter function syntax when passing previous value in. There is a difference between one returning the next value and one mutating the current. Without also transforming the internals of the setter function you can't make it consistent, at which point you might well ditch the set function. In a sense that is what composition in this case does because you'd be compiling the internals of your exported setter.

So far so good. On to authoring.

```js
export function $myStore() {
  let count = $signal(0);
  const increment = () => count++;
  const decrement = () => count--;
  return [count, { increment, decrement }] 
}
```

On the authoring side we would have to be aware of how to return the primitive. We could permit the return of functions if people wanted but getting Typescript to play nicely seems hard.

You don't really want people doing something like:

```js
export function $myStore() {
  let count = $signal(0);
  const increment = () => count++;
  const decrement = () => count--;
  return [$memo(() => count * 2), { increment, decrement }] 
}
```
While this would work you are forcing wrapping to do the derivation where it could just be a function. Of course we could make a faux reactive primitive that did just that like `$fn` etc and that would fix types. I don't have a better alternative here. 

I am pretty sure we don't transform all top level accesses of reactive state into function wrappers because of the implication on tracking. Once you start you need to do it everywhere and that creates its own inconsistencies which is what we've been trying to avoid here.

### Other core primitives

Luckily because nothing other than `$signal` has the ability to directly write ability the transform for all other primitives custom or otherwise is the same.

From a core perspective though we end up with only 3 other compiled reactive primitives. All types of derivations. Things like effects don't need to be compiled because we aren't messing with tracking scopes and they don't return anything. So none these actually return arrays.

My intention is not to simplify these. They will have their function wrappers and pass in previous values. They will still take all the arguments like equality check, intialValue etc..

#### `$memo`

Our typical derived primitive that returns the next state.

```js
const doubleCount = $memo(() => count * 2);
```
Notice the use of a function. That's because we want to still be able to pass in the previous value and to do more complicated logic here that involve multiple statements.

It is also consistent with if introduce derived state we want to be able to:

```js
let firstName = $signal(() => props.firstName)
```

#### `$async`

This one is for eager promise evaluation.

```js
const user = $async(() => fetchUser(props.id));
```

#### `$project`

This one is for mutable derivations like the proposed `createProjection`:

```js
const realizedUser = $project(
  prev => reconcile(user)(prev)
)
```

## So What?

Honestly that's what I feel like most of the time I look at this. So much effort to accomplish so little. Of course it is compelling to have signals/stores merge. Of course being able to enforce that someone can't just create some state in one place and have it update elsewhere outside of their control. I like all of this. In a sense it is an extension to what we do with Solid when we say you should access the signal in the props.

But you don't need any of this to accomplish mutation control and is making one less primitive worth it? I don't know. We've shown with Solid that this isn't a performance optimization. Even with things like SSR you can always just not have the reactivity at runtime and be super fast without a compiler.

The one thing that brings me back here is that we have the potential for a singular reactive language. Because of our use of JSX and javascript top level if we were to introduce a ReactiveScript extension like say `.rsx` it would be a superset of `.tsx`. We could have one language do everything. There is no seperate SFC format like `.vue` or `.svelte` and then additional processing in random `.js` files. We could just have one language that interopted perfectly with existing vanilla TS/JS.

Long term I think perhaps SFC formats become more of a problem then they are worth if we wish to exceed the powers of JS itself that go beyond component boundaries. So I admit my biggest attraction to this might not be because it is better thing to do, but because embracing it side steps the need for SFC based frameworks altogether. While Svelte and Vue are busy implementing Solid's fine-grained rendering, why even bother learning SFC + Reactive language when you only need to have the latter.