---
title: The Real Cost of UI Components
lastmod: 2019-06-18
source: https://ryansolid.medium.com/the-real-cost-of-ui-components-6d2da4aba205
---

# The Real Cost of UI Components

## Is the Component model popularized in modern UI frameworks pure overhead?

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/@ryansolid?source=post_page---byline--6d2da4aba205---------------------------------------)[Ryan Carniato](/@ryansolid?source=post_page---byline--6d2da4aba205---------------------------------------)Follow9 min read·Jun 19, 2019[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fbetter-programming%2F6d2da4aba205&operation=register&redirect=https%3A%2F%2Fmedium.com%2Fbetter-programming%2Fthe-real-cost-of-ui-components-6d2da4aba205&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--6d2da4aba205---------------------clap_footer------------------)547

4

[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F6d2da4aba205&operation=register&redirect=https%3A%2F%2Fmedium.com%2Fbetter-programming%2Fthe-real-cost-of-ui-components-6d2da4aba205&source=---header_actions--6d2da4aba205---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*wi5fnng9PVr_7CdU3g066g.jpeg)*Tetriminos By Ryan Carniato*

Components are everywhere. How could they not be? The key to consistently constructing any large system involves breaking it down into smaller pieces. They reduce risk and effort, alongside simplifying the “big picture” by abstracting away unnecessary detail. Components are a fundamental part of everything from architecture through engineering. They are not going anywhere.

No, what we are talking about today is the Component UI model popularized by React. In no way did this originate with React, but it heralded our current age of Component UI. Under this envelope, most front-end libraries and technologies are pulled. Even something like Web Components, which are just a simple DOM primitive, have individuals lobbying to standardize their features to essentially bring them to parity. No matter where you look in the front-end ecosystem you will find Components.

So what I want to know is, do they scale? Have we accepted the current model into our projects and into our minds without examining the consequences? And possibly most importantly, are all Components created equal?

## Web Components

For me, the question started with Web Components. These are supposed to be universal containers that any library can make use of. They are part of the DOM specification and promised the potential to be the last Components you ever need to pick up. More personally, they are where I started my experimentation into building UI libraries and have been my fallback.

Fortunately, you can see a pretty decent comparison by navigating over to the [JS Frameworks Benchmark](https://github.com/krausest/js-framework-benchmark). There you can compare a Vanilla JS (no library) implementation that uses a Web Component per row to one that does not.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*27KyWEEmO4JYlMaKAJNgdg.png)*JS Frameworks Benchmark*

As expected, when performing large multi-row operations Web Components are slower. All things considered, they are not that much slower when you consider popular libraries are in the 1.80 range. Vanilla JS is the ceiling of our potential here, any library using Web Components is going to take a hit.

## The Setup

These results alone aren’t all that interesting. Based on an experiment [Boris Kaul](https://medium.com/u/5e15f2bfd273?source=post_page---user_mention--6d2da4aba205---------------------------------------), author of ivi, ran using the [JS Frameworks Benchmark](https://github.com/krausest/js-framework-benchmark), I will be taking three different versions (levels) of each library to see how each solution scales as more Components are added. Each represents a different approach to handling Components. The scenario is still a bit contrived, but I like the approach described below as it isn’t just putting 10k Components on the screen. They are partially nested passing props through giving a better representation of the cost of communication.

### The Scenarios

- Level 0: No extra Components. This is generally the official implementation submitted to the benchmark.
- Level 1: A Component is made per row and per button.
- Level 2: Each row is further subdivided into Cell Components for each of the four table columns.

### The Contenders

- [ivi](https://github.com/localvoid/ivi): The quickest Virtual DOM library around. It supports stateful and stateless Components. Source [[0](https://github.com/ryansolid/js-framework-benchmark/blob/components/frameworks/keyed/ivi-0/src/main.js), [1](https://github.com/ryansolid/js-framework-benchmark/blob/components/frameworks/keyed/ivi-1/src/main.js), [2](https://github.com/ryansolid/js-framework-benchmark/blob/components/frameworks/keyed/ivi-2/src/main.js)] *
- [lit-html](https://github.com/Polymer/lit-html): Google-backed Tagged Template render library. While this library has no Components on its own, partitioning templates into multiple templates could have overhead. Source [[0](https://github.com/ryansolid/js-framework-benchmark/blob/components/frameworks/keyed/lit-html-0/src/index.js), [1](https://github.com/ryansolid/js-framework-benchmark/blob/components/frameworks/keyed/lit-html-1/src/index.js), [2](https://github.com/ryansolid/js-framework-benchmark/blob/components/frameworks/keyed/lit-html-2/src/index.js)]
- [Solid](https://github.com/ryansolid/solid): Fastest fine-grained Reactive library. Its Components are little more than factory functions. It will be interesting to see how expensive they are. Source [[0](https://github.com/ryansolid/js-framework-benchmark/blob/components/frameworks/keyed/solid-0/src/main.jsx), [1](https://github.com/ryansolid/js-framework-benchmark/blob/components/frameworks/keyed/solid-1/src/main.jsx), [2](https://github.com/ryansolid/js-framework-benchmark/blob/components/frameworks/keyed/solid-2/src/main.jsx)]
- [Svelte](https://github.com/sveltejs/svelte): Generates the smallest bundles with clever use of its compiler. It has its own component system as well as the ability to compile to WebComponents. Source [[0](https://github.com/ryansolid/js-framework-benchmark/tree/components/frameworks/keyed/svelte-0/src), [1](https://github.com/ryansolid/js-framework-benchmark/tree/components/frameworks/keyed/svelte-1/src), [2](https://github.com/ryansolid/js-framework-benchmark/tree/components/frameworks/keyed/svelte-2/src)]

If you don’t care about the comparison, the full set of results is available at the end of the article.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribe*Note: ivi’s implementation is modified to be as close to Solid’s implementation as possible to reduce possible differences. This means the code is a bit messier than typical, but it is also as fast as you are going to see with a Virtual DOM library.

## Benchmarking

### ivi

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*AYS_u8rs8cenQbp1IVqP9g.png)
ivi is the only Virtual DOM library in this comparison and it’s fast. Unlike the others, ivi has Components in its Level 0 implementation. This is because Virtual DOM libraries use Components for change management. This means the most optimal implementation will have Components. It also means ivi scales well no matter how many Components. It’s only the move to per column Components where performance drop is at all significant. Still, this spread is impressive.

![](https://miro.medium.com/v2/resize:fit:533/1*S6Z7bFhJt6A0Uza2Upx9Tg.png)
Memory pretty much follows suit. It isn’t until level two where the memory usage moves more significantly. We will be hard pressed to find another library that scales this well with Components.

### lit-html

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*OlkczXDe8iLR9m1ah-IhKw.png)
This performance does not scale nearly as nicely. I’m a bit surprised since lit-html doesn’t have any components. Admittedly the variance on ‘select row’ is problematic. I would have liked to get more consistent results but after countless reruns, lit-html would always spike on certain runs. Probably a limitation of the computer running the benchmark (a mobile Core i5) but it was the same constraints for all libraries. Still, the performance difference as you add Components is significant. ‘Create many rows’ and ‘append rows’ plummets as does ‘partial updates’. Perhaps memory will give more clues.

![](https://miro.medium.com/v2/resize:fit:532/1*RxxsA_GNAgRdu9w2cVfZYw.png)
Yes. That is significant. Level two uses more than double the memory of the initial implementation. I’m not sure what about splitting multiple templates in lit-html does this but when we are making five Components per row in 1000 rows it definitely adds up.

### Solid

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*lUQ6wsFFAZ6QMUKyBdm7ag.png)
Components were definitely an afterthought with Solid. It was always assumed it would be used with Web Components. However, the last two versions have brought major updates to Solid’s Components to bring them inline with features from other popular libraries. Solid does admirably here; Not as flat as ivi, but decent. It seems only the large data creates are affected here and most small changes aren’t impacted. This is due to Solid’s reactivity system being independent of Components. More on that later.

![](https://miro.medium.com/v2/resize:fit:550/1*Of-wPtIacsdhEoog1Hp6Mg.png)
I had to do a double take when I first looked at these results. Additional Components barely affected Solid’s memory consumption at all. Seven Components or 5000, it’s basically the same.

### Svelte

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*NBd-ovcX5BrGSQtlSRzgCA.png)
Svelte tags in as sort of middle of the pack. It isn’t as flat as ivi or Solid but it scales pretty proportionally. ‘Select row’ is still a pretty big drop. ‘Replace rows’ for some reason favors level one. This is not an anomaly. It consistently had better performance to split the row into a separate Component for that benchmark. My guess is due to the nature of its Reactive system being Component-based, separating off the Components means toggling only a single row reduces the amount of work. ‘Clear rows’ though is the place where performance degradation was the most noticeable. Memory is likely a concern, let’s check.

![](https://miro.medium.com/v2/resize:fit:567/1*IJTlx8pHwYmSVinB6gQjVw.png)
Yep. Svelte’s Components are heavy when it comes to memory. It goes from being the library with the smallest footprint in these tests to be the largest by a big margin. This is definitely something worth some attention in the future.

## Reflections

So, Components are not necessarily free. They don’t always just scale. Virtual DOM libraries, the same which introduced the Component Model, do seem to handle them pretty well. Ivi is the winner when it comes to scaling performance with Components. On the other hand, these real DOM libraries like lit-html and Svelte don’t seem to handle the scenario nearly as well. Solid is also a non-virtual DOM library but seems to handle the situation better. Let’s look at that for a minute.

A Virtual DOM library renders everything as virtual nodes, so it’s not surprising that stateless components are not heavy. It’s more of the same. In fact, Components are means to prevent unnecessary updates in Virtual DOM libraries. You actually need Components setup in a certain way to get the most of your code. You always have the choice of making more Components and they come fairly cheap but if you want performant code, you need to have certain Component boundaries.

For being pre-compiled Reactive libraries, Solid and Svelte couldn’t be any more different here. The key difference is Svelte (and Vue for that matter) still feeds their Reactive system into a Component system. While Svelte’s generated code still splits the creation from the updates, it runs the change progression top down, so the more Components the more work that gets done propagating change. All of its optimizations are localized. Conversely, Solid’s Components are ephemeral, in that they disappear as soon as they are run. This still has some overhead but it’s why the memory is largely unaffected. It is the Reactive context that governs the change propagation. This is more complicated and requires more code, but it is largely unaffected by your decision to modularize.

Lit-html, I’m not really sure what to think about. It doesn’t really have Components, but each template gets transformed into a careful separation of static and dynamic parts. I’m unclear what the overhead is here and possibly I’m doing something wrong, but it probably is something to look out for in the future.

## The Future of Components

[Rich Harris](https://medium.com/u/a11f7c00cbbe?source=post_page---user_mention--6d2da4aba205---------------------------------------), the author of Svelte, made the claim that “Frameworks aren’t there to organize your code, but to organize your mind”. I feel this way about Components. There are always going to be boundaries and modules to package up to keep code encapsulated and re-usable. Those boundaries are always going to have a cost, so I believe we are best served to optimize for those boundaries rather than introducing our own.

The one commonality between the libraries where Components scale is that they are not heavy. They are either not special or disposable. For libraries that require overhead to set things up to optimize update performance (as most Non-Virtual DOM libraries do), we need to do better not incurring the cost on ourselves unnecessarily.

So I’m going to make a bold statement here for the Non-Virtual DOM crowd. I think Components should vanish in the same way as Frameworks. If the new world is compilers, we can do better. We can optimize along bundle chunk lines instead of ES modules. If Components are throw away think about how much overhead we could reduce by inlining them in the right scenarios. If Components aren’t the necessary mechanism for change like in Virtual DOM libraries, what is to stop a level two implementation above from being compiled into its level zero equivalent?

This is a challenging statement to make as a proponent of Web Components. I’m sure Web Component performance will continue to improve and they are attractive in that they give us a common interface. A bit like micro-services for the frontend. But I wonder if they can ever be any more than an export format. Dedicated libraries will always have a leg up and have little reason to take on that overhead without purpose.

If you’ve made it here to the end, I hope you found this exploration as thought-provoking as I have. Or at least next time you will not be so quick to judge a library’s performance without looking at how it scales.

## localvoid/ivi

### fire: Javascript (TypeScript) library for building web user interfaces - localvoid/ivi

github.com

## Polymer/lit-html

### An efficient, expressive, extensible HTML templating library for JavaScript. - Polymer/lit-html

github.com

## ryansolid/solid

### A declarative, efficient, and flexible JavaScript library for building user interfaces. - ryansolid/solid

github.com

## sveltejs/svelte

### Cybernetically enhanced web apps. Contribute to sveltejs/svelte development by creating an account on GitHub.

github.com

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*Z93tkZx3NX_ffzqDPM7Zkw.png)
Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*tufgk-XMUFSanlLintKHIA.png)