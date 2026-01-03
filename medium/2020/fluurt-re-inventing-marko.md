---
title: FLUURT: Re-Inventing Marko
lastmod: 2020-11-18
source: https://ryansolid.medium.com/fluurt-re-inventing-marko-db265f07cc45
---

# FLUURT: Re-Inventing Marko

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/@ryansolid?source=post_page---byline--db265f07cc45---------------------------------------)[Ryan Carniato](/@ryansolid?source=post_page---byline--db265f07cc45---------------------------------------)Follow4 min read·Nov 19, 2020[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fswlh%2Fdb265f07cc45&operation=register&redirect=https%3A%2F%2Fmedium.com%2Fswlh%2Ffluurt-re-inventing-marko-db265f07cc45&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--db265f07cc45---------------------clap_footer------------------)262

1

[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fdb265f07cc45&operation=register&redirect=https%3A%2F%2Fmedium.com%2Fswlh%2Ffluurt-re-inventing-marko-db265f07cc45&source=---header_actions--db265f07cc45---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*7e-CxkZ0ej7SGH4ysU1xCQ.png)
The Marko Team has been working on a new rendering engine which is slated to become the core engine for [Marko](https://markojs.com/) in a similar way Fiber([React](https://reactjs.org/)), Glimmer([Ember](https://emberjs.com/)), and Ivy([Angular](https://angular.io/)) have been for their respective libraries. Today I want to give you a first peek into what this is going to look like.

A lot has changed since the release of Marko 4 in 2017. Most of the effort has been managing migrations, and updating tooling (ie.. the move to Babel, Webpack, Rollup). Marko 5 is in alpha and represents the modernization of the toolchain. But what about the architectural considerations?

The FLUURT(Fast Lean Unified Update and Render Target) engine is being developed with a few key goals in mind:

- Reduce shipped JavaScript size
- Improve client-side performance
- Improve development experience

These are an acknowledgement of the increasing need for a dynamic and interactive experience on the client. Marko has long had one of the best server-side implementations but as frameworks like [Next](https://nextjs.org/) show up, and even newer compiled approaches like [Svelte](https://svelte.dev/) it is clear it is time to take the next steps.

## Approach

Marko is an interactive templating language first and foremost so we should play to our strengths. We have the ability to compile our templates as desired. So to best accomplish our goals we’ve decided to attack the problem by building a new foundation on the client.

### 1. Reactivity

Being a declarative language with control over templating syntax and semantics reactivity is a clear way we can achieve both our goals. Relying on a small set of reactive primitives with code generation drastically reduces runtime size and complexity.

The approach the FLUURT is using is what I’m calling granular compile-time reactivity. This is basically a hybrid between what Svelte does with its compiler and granular reactivity found in libraries like Vue, Solid, or MobX.

The way this works, similar to other granular libraries, is through explicit dependency tracking and ensuring only relevant parts of code are run as your application state changes. However, instead of tracking dependencies at runtime, it generates the dependency arrays at compile time.

// useEffect hook depending on countuseEffect(() => { document.title = `You clicked ${count} times`;}, [count]);You can think of this like React Hooks if React automatically put the items in the array. This does lend to some edge cases re-evaluating more than desired but also reduces the runtime cost of tracking. Runtime granular reactivity, like MobX, actually unsubscribes and re-subscribes on every execution. This approach avoids it altogether.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeLike Svelte there is no VDOM, but unlike Svelte we still manage a subscription list. This means the baseline for a single component Svelte will be smaller, but it also means that FLUURT can have better performance.

### 2. First Class Composition

Language design can be challenging but we know that it is of utmost importance to make things consistent. To accomplish this we want to bring reactivity into the language of Marko in an extensible way.

The proposal is that our primitives are just Marko tags. This means that they can be co-located, nested, and composable. Co-located means that they can live in the template where they are used; nested means that they can be mounted/unmounted independent of the component; composable in that they can be constructed and extracted independently of the component file.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*yBWag7rbuCXVFgGtoU7aIw.png)
One would define a reactive value (ref/observable/signal) with a <let> tag. And a derivation (computed/memo/$) with a <const> tag. And writing your own can be used and consumed in the same way.

The ability to put these primitives nested in the template creates a cut and paste development experience, where the cost of refactoring is greatly reduced as code can mostly be moved around at will without change.

### 3. Sub-Component Hydration

From these parts you might be able to see that most of the library works independently of components. One benefit is this approach reduces [the overall overhead of having components](/better-programming/the-real-cost-of-ui-components-6d2da4aba205).

But more interesting, is that this allows for a new type of hydration. We can hydrate along reactive boundaries rather than component ones. We can split the stateful and static parts of the template and ship only parts of components and their descendants to the browser.

Classically with partially hydrated apps, as you might find in Marko or ElderJS, once you hit a stateful component you need to have all the JS code below that point. But FLUURT introduces the ability to break up our islands even smaller. It’s more like Hawaii than Taiwan.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*XBA5-mJt7Pns8_KbzthcdA.jpeg)
The amount of end-user code shipped to the client can be drastically reduced.

## Summary

There is a lot to be excited about in the upcoming FLUURT engine. It unlocks performance techniques yet to be seen in any major framework. It provides a development experience where writing less code isn’t just about the number of characters you commit. And it finally gives Marko the tools it needs to be as much of a force in the client as it has been on the server.

This is just the introduction. Look forward to follow-up articles where I will dig into each area in more depth.

- [Marko: Designing a UI Language](https://dev.to/ryansolid/marko-designing-a-ui-language-2hni)

Check out [Marko on Github](https://github.com/marko-js/marko), [Follow us on Twitter](https://twitter.com/MarkoDevTeam), or [Join us on Discord](https://discord.com/invite/RFGxYGs) to keep apprised of the latest updates.