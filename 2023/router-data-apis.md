---
# System prepended metadata

title: Router Data APIs
lastmod: 2023-10-19
---

# Router Data APIs

Big part of SolidStart Beta 2 is pushing things back into the libraries. So that means router based data fetching mechanisms should go back into `@solidjs/router`

This is a tricky time to make decisions as we want to be aware of 2.0 coming and future Islands Routing feature but we can't wait for them.

One key thing you will see in this proposal is that we've returned to defaulting to native elements for navigation.. ie lowercase `<a>` and `<form>`. We did make the switch not that long ago to `<A>` and we will keep it around for active class application.. but we want our navigation to work client side in a world where forms and anchors don't need hydration.

Example: https://codesandbox.io/s/route-loader-action-draft-2lt3t6?file=/src/index.tsx

## Loaders

Ideally this is what we could do but I think we might have to go with an alternative until 2.0 depending on feasibility.

### `cache`

```jsx
const fetchUser = cache((id) => {
    return fetch(`/api/users/${id}`)
  }, {
  key(id) {
    return ["user", id];
  }
});

// in component
const [user] = createResource(() => props.id, fetchUser)
````

### `revalidate`

```jsx
revalidate() // all
revalidate(key) // only specific key
```


## Actions

### `action`
```jsx
// anywhere
const myAction = action(async (args) => {}, {
  invalidate(args, response) {
    return key;
  }
});

// in component
<form action={myAction} />

//or
<button type="submit" formaction={myAction}></button>
```

#### Notes of `<form>` implementation
Implementing this requires stable references as you can only serialize a string as an attribute, and across SSR they'd need to match. Which is fine for server functions as they have a url, but not anything client only.

| | server actions | client actions |
|-|-|-|
|CSR|yes|yes|
|SSR|yes|no?|
|SC|yes|no|

And it is that column of client actions not working in SSR that I find problematic. The solution is probably just asking for a unique name.

```jsx
const myAction = action(async (args) => {}, {
  name: "my-action"
});
```
This can't be mandatory from a TS perspective because server functions, but it will error immediately and top level so I think we are fine. 

### `useAction`

Instead of forms you can use actions directly by wrapping them in a `useAction` primitive. This is how we get the router context.
 
```jsx
// in component
const submit = useAction(myAction)
submit(...args)
```

### `useSubmission`/`useSubmissions`

```jsx
type Submission<T, U> = {
  input: T;
  result: U;
  error: any;
  pending: boolean
  clear: () => {}
  retry: () => {}
}

const submissions = useSubmissions(action, (input) => filter(input));
const submission = useSubmission(action, (input) => filter(input));
```

## Other Thoughts

There is a symmetry here between things that defined outside of the component.

```jsx
const getTodos = cache(fetchTodos);
const addTodo = action(postTodo);
```

These also both feed well into server functions. So the idea is that you would wrap them at the source:

```jsx
// todoModel.js
const getTodos = cache(async () => {
   `use server`;
   const res = await db.getTodos()
   return res.data;
});

const addTodo = action(async (data) {
  `use server`;
  try {
    const res = await db.addTodo(data)       
  } catch(err) {
    throw err;
  }                       
});

// Todos.jsx
import { getTodos, addTodo } from "./todoModel"

export default function Todos() {
  const [todos] = createResource(getTodos);

  return <form action={addTodo} />
}
```

And what's cool here is Todos.jsx could be a server or client component.

## Detailed Look at Cache Design

Differences between Invalidate, Revalidate, Propagate. Preloading wants to revalidate but not propagate. But on router navigation it wants to propagate everything that was previously revalidated.

So there are multiple mechanisms here:

1. There is non-reactive cache
2. There is a key based triggering system
3. There is store based diffing

The cache itself isn't reactive because we need to handle preloading in the background. However we need to know that it has been updated so that when we enter a route we trigger all the others.

The trick to this has to be using a transition from the router to handle all reactive propagation. But how does the router know which data to re-validate. In the past we assumed all `routeData` was going to be invalidated on mutation. But preloading adds a new dimension.

I think to solve this we will need to be aware of router intent inside the cache function call which is tricky without Async Local Storage. We could set a global in the client atleast which is where this matters.

Intents would be:
"preload"
"navigate"
"back"

Also if we want to make sure we don't over trigger createAsync calls we need to have a signal per on revalidation.

