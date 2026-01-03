---
title: Solid — The Best JavaScript UI Library You’ve Never Heard Of
lastmod: 2019-04-04
source: https://ryansolid.medium.com/solid-the-best-javascript-ui-library-youve-never-heard-of-297b22848ac1
---

# Solid — The Best JavaScript UI Library You’ve Never Heard Of

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](https://ryansolid.medium.com/?source=post_page---byline--297b22848ac1---------------------------------------)[Ryan Carniato](https://ryansolid.medium.com/?source=post_page---byline--297b22848ac1---------------------------------------)Follow6 min read·Apr 5, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fgitconnected%2F297b22848ac1&operation=register&redirect=https%3A%2F%2Flevelup.gitconnected.com%2Fsolid-the-best-javascript-ui-library-youve-never-heard-of-297b22848ac1&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--297b22848ac1---------------------clap_footer------------------)1.1K

5

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F297b22848ac1&operation=register&redirect=https%3A%2F%2Flevelup.gitconnected.com%2Fsolid-the-best-javascript-ui-library-youve-never-heard-of-297b22848ac1&source=---header_actions--297b22848ac1---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*u-uRBe0VwtIlvQVftVk7Cw.jpeg)*From Shutterstock*

The last thing anyone is looking for is another JavaScript UI Library/Framework. It’s beyond fatigue from the crippling weight of constant decision making and chasing Unicorns. It’s just gotten so easy to make something. Web Components are responsible for a new “framework” every other day it seems like. So why even bother?

I’ve been conscious of this very question every step of the way. It’s starts with a clear objective.

Prove that Fine-Grained change detection has a place in modern JavaScript UI.

I knew this was ambitious so I had to set the bar pretty high. It’s not enough to be just interesting or good. I obviously think the world of [Solid](https://github.com/ryansolid/solid), but I hope after this article you will feel the same.

## Performance

While this should be the lowest on your criteria for considering a library, I knew this is where I needed to start. There are a lot of options out there and for this library to be worth anyone’s time it has to be fast. No. Fast is not good enough. It has to be arguably the fastest.

What is the fastest UI library you are aware of? Is it Vue, React, Inferno, Svelte, lit-html, Imba? Many libraries have made the claim and there are at least a handful of good benchmarks. I personally defer to the [JS Frameworks Benchmark](https://github.com/krausest/js-framework-benchmark). I wrote an article just about my approach to Benchmarking you can [read here](https://medium.com/@ryansolid/b-y-o-f-part-4-rendering-the-dom-753657689647). Meanwhile here is a screencap of a few choice Frameworks from the official repo on Chrome 72:

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*uycel33xQ3jeGMLovLw2sA.png)
The bottom row is essentially the averaged score. As you can see Solid is in a whole different category in performance compared to the popular libraries.

## API

Solid is built on fine-grained change detection the same fundamentals that KnockoutJS and MobX are built on. This is a development experience built on composable primitives. With a system like that there is no need for a Virtual DOM. In many ways, the Component boundaries are a de-optimization and these primitives can manage their own update cycles.

I also wanted to borrow from Reacts use of read and write segregation as giving at least the appearance of immutability is incredibly powerful. The control this affords addresses many of the classic shortcomings of this approach. I knew that I wanted to make it modern and compilable so I chose JSX as my templating language. This posed an interesting challenge as while control flow can be done in JS, I wanted to abstract the details of memoization and fine grain execution. The solution was to use JSX tags for control flow.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeI definitely felt like I was being a bit crazy doing this thing that was neither React nor typical fine-grained. But in the past 5 months, React’s direction has definitely validated my approach. First with React Hooks that use very similar primitives and most recently with [Lee Byron](https://medium.com/u/d9b1a61823fa?source=post_page---user_mention--297b22848ac1---------------------------------------)’s “Velcro Architecture” as described [here](https://github.com/leebyron/react-loops#what-is-react-velcro). Except I think Solid kinda does it a lot better.

const App = () => {  const [state, setState] = createState({ counter: 0 }),    timer = setInterval(() =>      setState({ counter: state.counter + 1 })    , 1000);  onCleanup(() => clearInterval(timer));  return <div>{( state.counter )}</div>}Every framework has its “counter” example so this should look similar except if you compare this with React Hooks you will notice a bunch is missing yet this still works. You can see it in action [here](https://codesandbox.io/s/solid-counter-8no2n9k94l). And that’s the thing with Solid it consistently leads to developing solutions with the least amount of code.

## Philosophy

Approaching designing Solid came down to a few principles. These came from taking the fundamentals of fine-grained change management under the lens of React’s design philosophy.

- Declarative Data (not just Views). This is an approach to describing data’s behavior along with its definition. This allows for easy composition by packaging all aspects of data’s behavior in a single place.
- Data flow is not tightly coupled to UI modularity. The decision of how you modularize your code should not be restricted by performance or data update concerns. You should be able to break apart components as suitable to UI need.
- Read/Write segregation. This the core takeaway from React. Uni-directional flow and immutable data are just implementations. As long as you control access at this granularity, larger systems can be made more predictable.
- Simple is better than easy. A lesson that comes hard for fine-grained magic. Explicit and consistent conventions even if they require more work are worth it. The aim is to provide minimal tools to serve as the basis to built upon.

I find these principles very powerful cornerstones that make developing with Solid predictable and provide strong guidelines to how to solve any potential problem that needs to be tackled.

## Features

This is definitely an area that can become a bit of a trap and like its biggest influences KnockoutJS and React, Solid keeps it simple. This is just a library, not a Framework. Like Knockout View Models of old Components are just functions. Since Solid uses fine-grained updates and Components are only rendered in their entirety once, you can wrap over state simply by using closures. On one hand Solid just provides a collection of simple primitives like createState, createEffect, createMemo, etc.. These can be composed to create much more powerful behaviors. On the other hand, it uses the idea of control flow to implement not only conditionals and loops with fallbacks, but Portals and Suspense. When it all came together it meant supporting most JSX conventions like spreads, refs, and Components as tags.

More than that Solid does not suffer from the classic weaknesses of fine-grained reactivity with large immutable data snapshots. Solid provides a data reconciler that diffs data similarly to how a Virtual DOM diffs nodes to allowing clean integration with immutable data stores like Redux or Apollo and the ability to use similar patterns to manage state.

const useReducer = (reducer, init) => {  const [state, setState] = createState(init),    [getAction, dispatch] = createSignal();  createEffect((prevState = init) => {    let action, next;    if (!(action = getAction())) return prevState;    next = reducer(prevState, action);    setState(reconcile(next));    return next;  }, [ getAction ])  return [state, dispatch];}But that’s not enough. I wanted this to be Web Component friendly. That’s one thing that most Virtual DOM libraries don’t support. That meant ShadowDOM aware Semi-Synthetic Event Delegation. Making modals work properly with Web Components is important as well, so having Portals work with their own Shadow Roots is a must-have.

What does that leave? Asynchronous Rendering with Time Slicing? Solid is fine-grained so independently scheduling updates is no effort. There is no need for a special construct to asynchronously apply updates. Solid’s own primitives can defer and control how updates propagate. Check out Solid’s implementation of [Sierpinski’s Triangle Demo](https://github.com/ryansolid/solid-sierpinski-triangle-demo) as popularized by the React Fiber.

## Why should I care?

That’s the tough one. For all that has been accomplished with Solid it is still a challenger in an over-saturated market. There are still many areas that need focus. CLI and development tooling come to mind as obvious absentees. It also needs to be proven. But that only comes with a community around it looking for improvement. I’m not positioning Solid as a real competitive option, just perhaps the best one you’ve never heard of.

Right now Solid is a good place to try out for yourself, to see if you like it. If any aspect of what I’ve covered in this article seems interesting come check it out and give it a Star on Github. My biggest challenge right now is trying to build up momentum to continue to even promote it through [existing comparisons](https://github.com/webcomponents/custom-elements-everywhere/pull/451#issuecomment-478097192). I’ve been working on this for the better part of 4 years even if the pieces only really finally all came together just over a year ago. I’ve spent a lot of time on this and constantly finding ways to improve it. If any part of this seems worthwhile please show your support and as always I’d love any feedback.

## ryansolid/solid

### A declarative, efficient, and flexible JavaScript library for building user interfaces. - ryansolid/solid

github.com

Build a Todo application with Solid:

## Building a Simple JavaScript App with Solid — The Best JavaScript UI Library You’ve Never Heard Of

### A guide to building a Todo List app using the Solid JS Library

levelup.gitconnected.com