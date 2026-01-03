---
title: Building a Simple JavaScript App with Solid — The Best JavaScript UI Library You’ve Never Heard Of
lastmod: 2019-04-08
source: https://ryansolid.medium.com/building-a-simple-javascript-app-with-solid-ff17c8836409
---

# Building a Simple JavaScript App with Solid — The Best JavaScript UI Library You’ve Never Heard Of

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](https://ryansolid.medium.com/?source=post_page---byline--ff17c8836409---------------------------------------)[Ryan Carniato](https://ryansolid.medium.com/?source=post_page---byline--ff17c8836409---------------------------------------)Follow7 min read·Apr 9, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fgitconnected%2Fff17c8836409&operation=register&redirect=https%3A%2F%2Flevelup.gitconnected.com%2Fbuilding-a-simple-javascript-app-with-solid-ff17c8836409&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--ff17c8836409---------------------clap_footer------------------)333

1

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fff17c8836409&operation=register&redirect=https%3A%2F%2Flevelup.gitconnected.com%2Fbuilding-a-simple-javascript-app-with-solid-ff17c8836409&source=---header_actions--ff17c8836409---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*bRJmXJ3SBv2auxZT7GcpSg.png)
No surprises here. The easiest way to introduce someone to a new UI library is to put together a simple application. [TodoMVC](http://todomvc.com/) has served this purpose for years comparing front end JavaScript libraries. One of the nice things is it has a clear set of functionality and it takes CSS out of the equation. Today we won’t be looking at Solid’s incredible performance. So let’s just focus on the JavaScript and get started.

We begin building our Todo app by creating the Store for state management. Following that, we will build our Solid components with JSX for the UI and connect it to the Store to create a working Todo application.

## Configuration

There is still a bit of setup before digging into the code. Solid is yet to have a CLI or the like, so it does require a bit of configuration. For TodoMVC this means a simple WebPack configuration that includes [babel-loader](https://github.com/babel/babel-loader) to run [babel-preset-solid](https://github.com/ryansolid/babel-preset-solid).

rules: [{  test: /\.jsx?$/,  use: {    loader: 'babel-loader',    options: {      presets: ['solid']    }  }}]This uses [JSX DOM Expressions](https://github.com/ryansolid/babel-plugin-jsx-dom-expressions) plugin is designed specifically to convert JSX tags into real DOM statements and convert JSX Expressions into property assignment and fine-grained computations. Since Solid does not use a Virtual DOM a typical HyperScript JSX transpiler will not be sufficient.

Ok. Good to go…

## Architecture

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*2YOeZaXqDoIwdfCllQNd4w.jpeg)*Photo by [Martinus](https://www.pexels.com/@mcore?utm_content=attributionCopyText&utm_medium=referral&utm_source=pexels) from [Pexels](https://www.pexels.com/photo/moss-87153/?utm_content=attributionCopyText&utm_medium=referral&utm_source=pexels)*

Every library and framework attack this a little differently and that is one of the first decisions to make here. Since Solid handles data updates independent of how you break up your Components, we have the flexibility to do this application in a few different ways. However, the most idiomatic way to keep the spirit of MVC is to abstract the data management into a Store (Model) and split out the View across a handful of small Components. It is far from the only way to attack this as you could put the whole application in a single Component or a dozen and not really see any difference in performance.

That is one of the key strengths of Solid. It is a library designed for refactoring. That’s not to say there isn’t a principled idiomatic approach. Just that it isn’t just ducks all the way down (homogenous) like you are taught to think of Component libraries. It is more like the whole application is made of the same substance, and depending on how close or far you look, it can look like a single or multi organism. A bit heavy, I know. Let’s see what that looks like.

## Store

Before we build our components, the first thing we will build is the Store. Often it is just simpler to start with the data. We will write this similar to how one would approach Custom Hooks in React. Simply wrap around a State Object and expose it and predefined update methods. The first piece is that a requirement of TodoMVC is to store the data in localStorage. Let’s create a reusable method.

What this code snippet does is create a new State object from localStorage or failing that from default value passed in by the caller. The next chunk creates a new Side Effect where it updates localStorage whenever the state is updated. While Solid requires Effects even in Views to be explicitly declared, dependency tracking is something that is done by default (although there is a second optional argument to explicitly set them).

It is important to note that State itself cannot be tracked only access to its properties, but JSON.stringify is doing the heavy lifting here iterating the enumerable properties and setting the dependencies. Finally, the function just nakedly returns the output from createState for you to use as you’d expect.

Now we can use createLocalState to compose our createTodosStore.

Ok, a decent amount is happening here. Mostly this is a showcase of many of the modes of setState. But more on that in a second. First, we initiate our localState object. Then we set up an Effect that calculates completed and remaining count of todos and feeds those back into the State object.

Solid’s setState borrows a bit from ImmutableJS and FalcorJS in that it allows both deep sets and the ability to queue up multiple updates. The reason is each setState evocation batches all updates that happen as a result of it immediately and synchronously. Yes, that means all the updates happen before the next line is executed. No concern wondering whether your state is up to date. It is.

Solid also has a mechanism to batch multiple setState calls similar to MobX’s action(freeze) but it’s often a lot cleaner to just do it in a single call. You can always update state the way you would with React with immutable data but since Solid is fine-grained for deeply nested updates there is a performance benefit to only setting what has changed. If you think about it, it makes a lot of sense. More than likely you already know what is changing but yet you have to clone all the way down the tree until that change only to have the renderer then reference check all the way down the tree as it renders. Solid just skips this inefficiency. Let’s look at a couple of examples here.

addTodo is an example of doing multiple updates by passing arrays as arguments. First, we are deep setting todos, and then the counter. It is completely possible to do this the way you would with React using a single object since the updates are top-level but it let me type the word state 3 times less and illustrated the approach.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeeditTodo is an example of doing a deeper path set where only the todo at the found index is updated. The todo being passed in is an object so the changes are being merged with the item already at that location rather than being replaced. This is consistent with how classic React setState works with objects.

toggleAll uses a conditional method on the path. Any item in the array that matches the condition is updated. In this case, all items which are not equal to the current state of the checkbox are changed to that state.

## Application

I imagine you are pretty done with State by now so let’s look at what we can do on the other side of things. Starting top down let’s create our application.

The application starts at the bottom where we create a computation root for our application. It sets the bounds on fine-grained execution and memory disposal. All Solid apps use this as the application start point. Within you can use the return value of the JSX as normal dom nodes as shown with TodoApp being inserted into the Body.

Inside our TodoApp component, we create an instance of the store destructuring out the required state and update methods and we set up a simple event handler to listen to hashchange to do some simple routing. onCleanup makes sure to dispose of it when the root is released.

You might be asking your why is this not wrapped in an Effect? Well this is the crux of the difference between Solid and React. This function will only ever execute once. There is no need for explicit creation/mounting hooks, as the Component execution is the setup step. You only need Effects for things that update. An effect with no dependencies has no meaning.

From there the returned JSX looks pretty normal with the exception of one thing: the control flow element Show. A fine-grained library does come with some complications when it comes to handling the memoization and reconciliation of certain parts of dynamic insertions. Wrapping in prebuilt Components keeps this simpler to use. Solid has a few more of these including For, Switch, Portal, and Suspense.

Are you still here? I know there is quite a lot to digest since on the surface you think you might be dealing with something like React yet it works oddly differently. The truth is we aren’t quite done yet.

## Header and Footer

In the next code chunk, we are dealing with some real DOM elements finally.

These 2 are what is classically called dumb components. The TodoHeader component is pretty straightforward. It is waiting on an Enter key to add the new Todo. The Footer looks equally simplistic until you spot one little thing, classList. Such a common case to handle multi-class inclusion, that managing them via an object with boolean values to indicate their inclusion is built in.

## Todo List

I broke the Todo List itself into 2 Components, one for the list, and one for each item. The list itself maintains some additional state that is not in the store, like the status of the currently editing Todo.

There are a couple of approaches on how to handle the list, but there are performance benefits to handling it the way shown above. Solid.js uses implicit event delegation like many modern libraries so declaring the function once in the parent and passing it in actually reduces the overhead on per Todo basis. Perhaps unnecessary for building a simple application but I find it difficult to avoid naturally making these sort of performance optimizations. It’s something that you don’t need to think about as much with Class Components like what you’d find classically with React since Todos will share a prototype but are a real thing once you move to Hooks. The model property is like the key in React but it accepts objects and isn’t used for reconciliation. Just for attaching data to delegated events and directives.

## Conclusion

And that’s that. TodoMVC in itself is not the most interesting example, but at this point it is so standardized I feel you’ve come to know what to expect. There were a few other options here that could have been taken. Setting the store up with a Reducer or at least using a single Dispatch function could have cleaned up some of the function passing but I feel this was the most natural way at looking at Solid.

The whole project source code covered in this article is available here:

## ryansolid/solid-todomvc

### Solid implementation of TodoMVC.

github.com

And as always check out Solid:

## ryansolid/solid

### A declarative, efficient, and flexible JavaScript library for building user interfaces. - ryansolid/solid

github.com