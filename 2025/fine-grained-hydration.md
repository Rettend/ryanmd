---
# System prepended metadata

title: Fine-Grained Hydration
lastmod: 2025-07-23
---

# Fine-Grained Hydration

Honestly this has been pretty tricky space since before SolidJS it didn't exist. There were fine-grained renderers. But none of them did SSR. And to be fair I don't know enough about how other non-fine-grained solutions worked to say that my understanding is complete. They were different enough that I didn't really gain much by looking at them. If it were VDOM they could just create a tree and compare it to the real DOM. If they were a template based they could probably identify their components in some way to get references.

To be fair outside of VDOM it was really only us and Svelte around 2019 that were doing non-VDOM hydration. But we had one pretty difficult constraint compared to them.

**JSX is created anywhere and out of order!**

By that I mean you can do this:
```ts
function App() {
  const myDiv: HTMLDivElement = <div>Sucker</div>;

  return <div>{myDiv}</div>  
}
```

You can't do that in Svelte or Vue or any of the "template" languages. And if we are hydrating something that looks like:

```html
<div>
  <div>Sucker</div>
</div>
```
How are we ever going to get the right div? The code for myDiv runs first but its actually nested in the template.

The solution I came up with is simple. Add a counter. Now the HTML looks like:

```html
<div data-hk=1>
  <div data-hk=0>Sucker</div>
</div>
```
When we start up our program we grab all the elements with data-hk and put them in a map by id. Then when we go to create during hydration we get the counter and grab that element instead.

This works regardless of components or really anything as long as stuff executes in the same order. Which leads to the next challenge. Stuff can be out of order due to async timing.

```ts
const LazyComp = lazy(() => import("./lazy"));
const LazyComp2 = lazy(() => import("./lazy2"))

function App() {
  return <>
    <LazyComp />
    <LazyComp2 />
  </>
}
```

I used lazy but the same could be conditionals based on async data etc.. what order do these resolve in? It wasn't enough to have a counter. The solution I found was to use nested counters based on Component contexts.

Because layout wise we know that `LazyComp` comes before `<LazyComp2>` these could be each 0 and 1 .. and then their children could be `0-0`, `0-1` or `1-0` and `1-1`. By inheriting the nested counter would could ensure no collisions. Of course this can get pretty deep and people would notice these huge hydration ids. We implemented recently better compression but it is important for rendering performance that we only compress once. The performance loss of hashing on server rendering was measurable. So any approach we used to reduce these ids would only "compress" the finished section.  We removed the `-` and instead use characters if the id extends more than a single digit. So if lazy component had 12 templates under it the third would have `02` and 12th would have id `0a11`.

These ids also proved useful as we could use them as serialization addresses for our async resources. Basically a mechanism for stable references across client and server for a single request/hydration. This made implementing Islands/Server Components much more trivial than in other solutions as we can pick up and stop hydration on a whim based on these ids. 

## So why bring this up?

Well there was that benchmark. You know and even though Solid had the fastest renderer I believe it was middle because of these hydration ids. No one else needs to do this. Solid's approach to hydration as I've shown is top notch in terms of performance matching partial hydrated solutions.

But we still have that extra id. Now how could we possibly avoid it? Is it even possible?

I have one idea. So I thought why not explore it. It's come up a few times now but I'm not sure I had written down my thoughts in a single place. That idea is deferred rendering. See.. React doesn't care that JSX is created out of order because it doesn't do anything until it gets its VDOM tree back and then diffs and patches. In theory Solid doesn't need to do anything until its JSX is inserted into other JSX.

But it comes with a steep price. A `<div>` wouldn't be a div anymore. Picture if `<div>` returned a function rather than an element. Almost like a `.bind` or partial application. You can picture the props are associated with it already but it isn't until it is called that it becomes an HTMLDivElement.

```ts
function App() {
  const myDiv: (() => HTMLDivElement) = <div>Sucker</div>;

  return <div>{myDiv}</div>  
}
```

This would still work as inserting it would know how to handle it.. but `myDiv` would not be a div. You wouldn't be able to introspect it. If we were to do this I'd make it not a function but something opaque. But it does have an interesting consequence.

The elements would be created in order. One could picture being able to be able to maybe find things via component identifier and then just walk the template.

Let's look at the impact of this sort of change on a whole.

### 1. Don't need wrapping functions for JSX

The render function could be:
```ts
render(<App />, document.body);
```

As you saw above you don't have to lazy wrap the JSX. While I was using it as an example most of the time in Solid you would wrap the JSX in a function so that you wouldn't render stuff unnecessarily due to conditional logic.

```ts
function App() {
  const myDiv = () => <div>Sucker</div>;

  return <div>{condition() ? myDiv() : ""}</div>  
}
```

Or so you could insert it multiple places as DOM elements can't live in multiple place. Now you could just:
```ts
function App() {
  const myDiv = <div>Sucker</div>;

  return <div>
   {myDiv}
   {myDiv}
  </div>  
}
```

It is also helpful for avoiding early rendering in props.

```ts
function App() {
  return <MyUI customIcon={<Icon />} />
}

function MyUI(props) {
  return <>{props.customIcon ? props.customIcon : <DefaultIcon />}
}
```
This code today would render the `<Icon>` twice and probably mess with hydration since one of them isn't inserted. You can check `in` to avoid this but it doesn't help if the prop is defined and people are toggling it.

```ts
function App(props) {
  return <MyUI customIcon={props.icon} />
}

// fixes double render but always true
function MyUI(props) {
  return <>{"customIcon" in props ? props.customIcon : <DefaultIcon />}
}
```
Basically your best bet in Solid today is to use render functions. Or pass component constructor.

One last possible upside is "JSX" would be a typed thing so it would be possible to say return it from response helpers like:

```js
function myFn() {
  "use server";

  return json(<MyJSX />)
}
```

### 2. Only way to get introspect is `ref` 

The tradeoff of course is `ref`. Even though it is essentially a function you shouldn't be able to call it yourself. Then we are back to out of order creation. So you have to wait for the `ref`.

In lot of ways this brings things more inline with `html` and `h` functions since they can't return raw elements either because it would push the developer to do even more function wrappers all over the place. In a sense they have already gone this way.

The only way to get the resolved nodes is to insert them or to call `render` on them.

### 3. Children introspection is off the table

What about the `children` helper? Yes what about it? Unlike a VDOM our JSX output isn't introspectable, it isn't a representation of the UI but basically a defered set of instructions.

```js
const els = (
  <div>
    <h1>Hello</h1>
    <p>Lorem Ipsum</p>
  </div>
);
```

`els` above isn't a bunch of nested objects.. It's basically a function that knows how to create DOM elements.. you can picture it compiling to:

```js
const tmpl = template(`<div><h1>Hello</h1><p>Lorem Ipsum`)

const els = jsx(() => tmpl());
```

I invented the `children` helper in Solid to solve Context because it was getting executed out of order. This approach solves that. But it means that there is no way to mutate things before they are inserted that aren't part of the declarative bindings that already exist.

Template languages like Svelte are used to having this limitation. And using `children` in Solid has been more of a hack at times to get around other problems (like double access that aren't a concern anymore with this).

It does mean certain React patterns are just off the table. They sort of always have been but this is the definitive end of the line were this the approach. I think I depend on `children` for things like `solid-transition-group`. There are places with animations where you want to get into the elements and mess with them. It should be possible with `ref` but it probably requires exploration.

### 4. When I say no children introspection I really mean it

Components like `<Switch>`/`<Match>` or like `<Route>` in the router become harder with this approach. While they don't render anything any just return objects there is basically no way to get that object ahead of time.

To be fair they could just be functions but there is something ergonomic about these nested JSX systems. This was very important pre-univeral rendering for making Solid components systems in non-DOM envs. Since Components are just functions. Now they aren't.

If we were to have the ability to execute these early the user would need to be careful not to render native elements early or risk hydration issues.

Maybe `children` could exist but stop at native elements. Then atleast these sort of components could still exist.

### 5. JSX would no longer be a criteria for wrappers

```js
<Show when={enabled()} fallback={<Placeholder />}>
  <Content />
</Show>
```
`fallback` and `children` here would not need to be "getters".

To be fair as soon as any condition was re-introduced they would. It is likely for special compilations like ternaries they would still need to considered expensive expressions and memoized. As you wouldn't want to create new references every time count was updated under the same range.

```ts
<>{count() > 5 ? <Content /> : <Placeholder />}</>
```

### 6. I can no longer do the Solid Intro demo

You know the one where I transform DOM commands into JSX. I mean I can still sort of do it but it would require changing the append call to `render` right away. A `<div/>` would not be a div. I think this would have a significant impact on the perceived simplicity of the framework.


## Conclusion

This is just an idea that I wanted to put out there so we can explore it. It does have potential to make things better for Hydration/Server Actions/Server Components. I haven't even explored this space because it hasn't been open to us. 

But it comes at a cost. You notice that the server seems to benefit most from this but it also would lend to having consistency between `h`(hyperscript) and `html`(Tagged Template Literal) solutions that aren't able to leverage our compiler.

Not to mention I think there is a performance overhead here. More things in memory. I haven't tested that though so maybe that is worth exploring. But peformance aside, is the cost too great?