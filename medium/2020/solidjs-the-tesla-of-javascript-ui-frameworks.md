---
title: SolidJS: The Tesla of JavaScript UI Frameworks?
lastmod: 2020-10-18
source: https://ryansolid.medium.com/solidjs-the-tesla-of-javascript-ui-frameworks-6a1d379bc05e
---

# SolidJS: The Tesla of JavaScript UI Frameworks?

## Technology created in the name of economy can also be used for Performance

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/?source=post_page---byline--6a1d379bc05e---------------------------------------)[Ryan Carniato](/?source=post_page---byline--6a1d379bc05e---------------------------------------)Follow5 min read·Oct 19, 2020[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2F6a1d379bc05e&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fsolidjs-the-tesla-of-javascript-ui-frameworks-6a1d379bc05e&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--6a1d379bc05e---------------------clap_footer------------------)332

3

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F6a1d379bc05e&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fsolidjs-the-tesla-of-javascript-ui-frameworks-6a1d379bc05e&source=---header_actions--6a1d379bc05e---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*-IdGLs91GAWsNWO6ozibvw.png)*Red Tesla Model 3 By By [canadianPhotographer56](https://www.shutterstock.com/g/canadianPhotographer56)*

[SolidJS ](https://github.com/ryansolid/solid)is a newer JavaScript UI Library(open sourced Apr. 2018). The premise for its origin simple: Showcase the usability and performance of fine-grained reactivity in web application development.

Two years later I still find myself explaining how Solid has carved out its unique niche in an overcrowded space. After reading [Swyx](https://medium.com/u/547f259e265e?source=post_page---user_mention--6a1d379bc05e---------------------------------------)’s [Svelte for Sites, React for Apps](https://dev.to/swyx/svelte-for-sites-react-for-apps-2o8h) which again poses the dichotomy for Sites and Apps, I have another take.

## Building for Economy

### Intel Core Processor

The Intel Core Micro-Architecture was not originally designed to be the powerhouse it is today in server and desktop machines. It was for mobile chips.

In the early 2000s Intel’s Netburst architecture used in the later Pentium models had taken clock speeds to unprecedented levels. For years [Moore’s Law](https://en.wikipedia.org/wiki/Moore%27s_law) had run uninterrupted. Unfortunately, they used a lot of power and dissipated a lot of heat. Not exactly something that you could have sitting on your lap.

Intel had commissioned a team to solve. The team realized pretty early on there was no way they would be able to cool the existing generation processors with a fan thin enough to support the designs they wanted. So they came up with a new architecture that worked at lower clockspeeds.

Fast forward a few years and the desktop market hit the same ceiling. They realized the same technology could be applied there. It wasn’t long before Intel’s old architecture was completely replaced across its whole lineup from the lowest power mobile device to the most powerful multi-CPU servers. It was a big part of Apple’s move to Intel chips in their computers and more or less steered Intel off a trajectory to destruction.

### Electric Cars

Electric car technology has existed in some form for over a hundred years. But we haven’t seen wide commercial mass production until the last decade or so.

There are many factors at play here. I’m not going to say financial viability isn’t the biggest shift in this space. However, the catalyst from consumer perspective was economy.

Automakers took the efficiency of electric motor technology and used it to produce the smallest least wasteful vehicles they could. We quickly saw cars like the Nissan Leaf, Chevy Volt, and electric versions of all our favorite subcompact cars. We saw hybrid technology storing energy from braking to charge the motor all in the name of less.

The thing is electric motors are incredibly efficient and produce an astounding amount of torque. So it was only a matter of time before they would be harnessed for performance vehicles in the consumer space. At first as a way of augmenting existing gasoline engines. Later to bring a whole new type of performance vehicle like the Tesla Roadster.

That’s not to say the electric economic car is not already more performant than the cars that came before it. Just when you shift the focus you can also achieve new heights on the opposite end of the spectrum.

### JavaScript Compilers?

JavaScript compilation first gained popularity to bring other language semantics into JavaScript. While it might have started as a way to make JavaScript more palatable, it soon served as a tool to standardize features in JavaScript's own future spec cross platforms and browsers.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeFrom a framework perspective, the earliest compilers might have been in templating engines as a way to convert declarative syntax back into executable code. This was motivated to provide an easier abstraction to reason about to ease developer experience.

Svelte took similar techniques and brought it right down to the bundler. Using static analysis and the knowledge of tree-shaking(dead code elimination) Svelte leverages a minimal runtime to produce some of the smallest JS bundles. Most notably automatically detecting features being used to only importing the necessary code.

It only follows, compiler-based JavaScript is a tool for raw efficiency and so too can be used for performance.

## Building for Performance

What if instead of the most minimal reactive implementation which ties into components we could opt into granularly optimized updates? What if our reconciliation algorithms were larger but smarter? What if instead of implicit language features we allowed for explicit to better capture end-user intent? And what if we still could leverage all the same static analysis and aggressive feature detection?

We can still have all the compiled characteristics of being small and having less runtime overhead but use that instead to give us room to drastically improve performance. Svelte is small but doesn’t outperform the fastest VDOM libraries like Inferno. Solid on the other hand is in a different league.

## How we wrote the Fastest JavaScript UI Frameworks

### I’m sure you’ve been there at one point. You had a great idea. Something novel. Something new. Yet something impactful…

medium.com

## How we wrote the Fastest JavaScript UI Framework, Again!

### This time we conquered the Server.

levelup.gitconnected.com

## JavaScript UI Compilers: Comparing Svelte and Solid

### Are precompiled JavaScript UI’s the next silver bullet?

medium.com

## Closing Thoughts

Leo Horie, author of [Mithril](https://github.com/MithrilJS/mithril.js), to someone on Reddit wanting to get the TL;DR described Solid as:

Svelte is to Vue as Solid is to React

That’s a pretty interesting perspective, and one that I find helps a lot of people first encountering Solid. Both Svelte and Solid are compiler driven variants of their counterparts. But what does that actually mean?

I’ve seen it positioned to the difference between being simple and being easy. Solid while being reactive is clearly on the React side of things where Svelte has inherited Vue’s easiness.

If [Swyx](https://medium.com/u/547f259e265e?source=post_page---user_mention--6a1d379bc05e---------------------------------------) is on to something with Svelte being ideal for sites, Solid is definitely going for applications. In the same way that we now enjoy all classes of electric vehicle, you can enjoy all manners of compiled JavaScript UI libraries.

And while this may not mean there is a one size fit all solution for sites and apps, like with automobiles, improvements in technology mean the libraries of today are already better positioned across a wider range of usage than those that preceded them.

## ryansolid/solid

### A declarative, efficient, and flexible JavaScript library for building user interfaces. - ryansolid/solid

github.com

## sveltejs/svelte

### Cybernetically enhanced web apps. Contribute to sveltejs/svelte development by creating an account on GitHub.

github.com