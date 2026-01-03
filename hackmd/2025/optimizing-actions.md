---
# System prepended metadata

title: Optimizing Actions
lastmod: 2025-02-17
---

# Optimizing Actions

Most of the design of actions is around the fact we want them Progressive Enhanceable. But properly being PE doesn't mean that everything needs to suffer because of it. While a revalidate everything approach is easy, consistent, and handles the edge cases automatically, it isn't always the most optimal.

So what if we want to support a world that doesnt involve revalidation. I think of the Strello demo for example. Do we really need to be sending the whole list back everytime? For moving things in the list, sure But even for a simple name update?

### 1. Single-Flight mutations aren't necessary when `revalidate: []` and no navigation.

I've been working on making it so that empty array or empty string means revalidate nothing. We do all by default but once explicit we follow that. In these cases running the preloads on the server would bring us no value unless there were new things to fetch. That only happens on navigation.

So for the case of on page navigations where are opting out of revalidation we should skip the overhead of Single-Flight.

### 2. Let Server functions know when they are being called under PE

The biggest reason it is hard to do anything specific for the non-revalidatoin case is that it doesn't work with Progressive Enhancement. If you want to do custom behavior it would never work if JS isn't present in the browser. But if we know that at the time the function runs we can choose how to handle the response properly.

Maybe this could be part of `getServerFunctionMeta` etc. On the positive `revalidation` headers means nothing for PE anyway but if you are doing specific work your action will probably return serialized value. And by default with PE that means that we want to show something (maybe an error). So we need to know if PE so we can still return nothing in this case and let the page reload handle it.

```ts
const addTodo = action(async (formData) => {
  "use server";
  const { noJS } = getServerFunctionMeta();
 
  const title = formData.get("title") as string;
  const todo = await db.Todos.create({ title, completed: false })

  // with no JS we don't want to show the completed submission
  // just let the page re-render itself
  if (noJS) return;
  // we know there is JS in the client revalidate nothing and send back todo
  return json(todo, { revalidate: [] });
    
  // note... we might want to `throw` here to keep
  // `Todo` out of the declarative return types
})
```

> **Note** in the case of thing like Trello where all the data is known on the client we could just always return `json(undefined, { revalidate: []})` as it would no impact on PE and we don't need any new information from the server.

### 3. `onComplete` option to `action` API

See the problem with just returning the Todo is we also want to clear the submission. So we can do that via JavaScript. This hook should only ever run in the browser but gives us more control. I think it belongs on the `action` rather than on `useSubmission` though because it shouldn't live within the state of the component and only be there basically to update global stuff like the cache itself.

```ts
const addTodo = action(async (formData) => {
  "use server";
  // all the code
}, {
  // client only hook
  onComplete(submission: Submission) {
    if (!(submission.result instanceof Error)) {
      const key = getTodos.key
      const todos = cache.get(key);
      // add the todo to list yourself
      cache.set(key, [...todos, submission.result]);
      // remove the optimistic update
      submission.clear();
      // trigger createAsyncs by revalidating with force = false
      revalidate(key, false);
    }
  }
})
```

Avoiding the diff in this case in theory would only work if the cache itself were a store.  I'm not sure if that is where we want to be in the general sense but something to keep in mind.
