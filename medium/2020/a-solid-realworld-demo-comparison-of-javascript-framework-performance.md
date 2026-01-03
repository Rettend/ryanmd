---
title: A Solid RealWorld Demo Comparison of JavaScript Framework Performance
lastmod: 2020-02-26
source: https://ryansolid.medium.com/a-solid-realworld-demo-comparison-8c3363448fd8
---

# A Solid RealWorld Demo Comparison of JavaScript Framework Performance

## SolidJS enters the ring as the newest challenger in the RealWorld Demo. Let’s see how it stacks up.

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](https://ryansolid.medium.com/?source=post_page---byline--8c3363448fd8---------------------------------------)[Ryan Carniato](https://ryansolid.medium.com/?source=post_page---byline--8c3363448fd8---------------------------------------)Follow8 min read·Feb 27, 2020[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fgitconnected%2F8c3363448fd8&operation=register&redirect=https%3A%2F%2Flevelup.gitconnected.com%2Fa-solid-realworld-demo-comparison-8c3363448fd8&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--8c3363448fd8---------------------clap_footer------------------)504

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F8c3363448fd8&operation=register&redirect=https%3A%2F%2Flevelup.gitconnected.com%2Fa-solid-realworld-demo-comparison-8c3363448fd8&source=---header_actions--8c3363448fd8---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*tuxKv-hVTjGvZ_VqeD89FQ.png)
The first thing you should know about me is that I'm a sucker for performance benchmarks. I started down the path of writing reactive JavaScript UI libraries with something to prove. Something about the approach intrinsically clicked for me and I wasn't going to rest until I could prove it to be superior to its Virtual DOM counterparts. For me, that started with performance. But that was 5 years ago, of which it took 4 of them to reach that goal.

So yes, I'm talking about [SolidJS](https://github.com/ryansolid/solid), a modern fully-featured reactive JavaScript UI library. It checks all the boxes with JSX components, Hooks-like API, Context, Portals, Fragments, Suspense, Web Component support, SSR, you name it. And it’s probably the most performant library of its nature you’ve ever seen (see below), but that’s not what we’re focusing on today. Instead of digging into rendering performance, we are going to look much more holistically at application performance.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*171wYvnqvRYsLNkeEsXV1Q.png)*JS Framework Benchmark Results Chrome 80 (Feb 2020)*

## RealWorld Demo

## gothinkster/realworld

### While most "todo" demos provide an excellent cursory glance at a framework's capabilities, they typically don't convey…

github.com

The RealWorld Demo is a large community-backed open source project that showcases all web frameworks client or server-side through a building an example app that is much more substantial than the typical TodoMVC toy demos or the stripped out scenarios you find in benchmarks. As Conduit, a Medium clone of sorts, your application has to handle real issues like authentication, routing, and async data loading. It has a standardized specification making it an even better place to shop for your next library or framework.

Of course, that doesn’t keep us performance junkies out. Instead of it being about rendering 10000 spinning cubes or rows in a table, we get to look at loading optimizations, code size, and user and developer experience. So being ambitious the task seemed simple enough. Make the smallest and fastest implementation that everyone would see and want to use in their projects. For Solid, this meant highlighting its strengths, and in so testing the limits of what can be done with a purely client rendered single-page app. In the course of this process Solid would have to go up against other libraries including Svelte, the reigning king of this demo, using SSR. So I wanted to test a hypothesis.

I’ve witnessed on lower-powered devices especially the gap in render performance gets wider between higher and lower performing libraries. If a library like Solid is already a few hundred milliseconds faster to render a large number of nodes at what points do earlier first meaningful content times that come from using SSR not have a meaningful impact?

## The Test

So right off I’m going to say the testing method here is hardly conclusive. I simply ran every implementation 10 times and averaged the top 3 results. I based this comparison on the one they do yearly. For the 2019 edition see:

## A RealWorld Comparison of Front-End Frameworks with Benchmarks (2019 update)

### by Jacek Schae Also available in: Turkish - thanks to @erdenizZz, Portugues - thanks to @felipefialho For the third…

www.freecodecamp.org

This comparison tests on 3 metrics Performance, Size, and LOC. I’ve gathered a few other metrics from my runs to give greater insight but it’s essentially the same test. Performance is run through Chrome Inspectors Lighthouse Audits. Size is the total size in kb of JavaScript sent to render the initial landing page. Finally, LOCs are measured using [cloc](https://github.com/kentcdodds/cloc) to add up total lines of JS, CSS, and HTML found in the src folder (ie. not including library code).

This is in no way an official comparison. [Solid is currently waiting to be merged](https://github.com/gothinkster/realworld/issues/471) so I wanted to take this opportunity to see how it fared. I picked the best performers from the 2019 comparison + popular libraries React, Angular, and Vue and gave it a run. You can try Solid’s App here:

## Conduit

### Solid RealWorld Example App

ryansolid.github.io

## Performance

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*gdSsQSH5FpCjn5zbXJ6hZw.png)*Lighthouse Performance Score (Higher is Better)*

This benchmark is much closer than most would be given the spread of libraries here. Lighthouse Audits basically score every library out of 100 based on initial loading metrics like Time to First Byte, First Contentful Paint, Time To Interactive, Maximum Input delay. All libraries are run under CPU and Network throttling to simulate lower-end devices and poor network conditions. Half the libraries still score almost perfect here. The popular libraries are a bit slower with Vue leading the pack, and the now-dated React Redux trails.

There is no real distinguishing on the score. So let’s look at one of the more exaggerated scores Time To Interactive(TTI). This is when the page is ready to receive user input.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*9qxpti_syV842LTK9nsXtA.png)*Lighthouse Time to Interactive (In seconds — Lower is Better)*

Still, the top 5 libraries are really close here. Svelte and Solid in a dead heat. If anything this only exemplifies the real impact of performance degradation on popular libraries with Angular and React Redux taking over 5.5 seconds to be interactive.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeAt this point, I looked around at a few other repositories to see if any other RealWorld Examples had better performance numbers. After trying a dozen other repos I only found one: Microsoft Blazor. Blazor is a Web Assembly library that allows the implementor to write their applications in C# and run them in the browser. It scored a 99. Impressive.

…well it would be if it wasn’t the slowest library I had come across. So slow that Chrome thought it was done loading while still on the loading screen, so it gave it really high scores since it loaded the loading screen quickly. So I started looking at the Chrome performance timeline and I found a very different story. After seeing how that differed, I decided to see how these libraries stacked.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*dN7sDpYY_aZuYeIiVIhxZw.png)*Chrome Inspector Trace (In ms — Lower is Better)*

Now total timeline of resource loading from the Inspector Timeline is not a clear indicator of how fast the page feels to load as there is JavaScript loading and running and DOM nodes rendering. In contrast to TTI, these numbers are around 1 second. The only interesting thing here is that libraries with code splitting other than Solid (Svelte, AppRun) were proportionally slower compared to their size. And medium-size code bundles in a single file like Elm and HyperApp loaded a lot faster.

One difference is the Solid app is only split into 3 chunks while Svelte and AppRun had around 8 chunks. It’s possible given the limitation of the browser on the number of concurrent connections that initial resource loading can get bottlenecked by too much code splitting. Solid also uses a Render as You Fetch implementation which has API calls being made before code for the route is loaded which also probably lent to it’s faster resource loading time.

Conclusion: Performance for the top-performing libraries are too close for this sort of test to differentiate. We have to continue to use synthetic benchmarks for that. Solid’s client rendered app topped every test so no complaints.

## Size

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*5z67nsKZDvV60E-KrebRlQ.png)*Initial Page JS Size (In kb — Lower is Better)*

People have measured this test differently in the past looking only at the initial code chunk. I think it is essential to look at all the JS needed to load the first page. Solid’s 12.1kb came out in front of the previous front runner Svelte at 14.8kb. This is the first test ever that Solid was smaller. Svelte is usually 50% smaller. A previous comparison called out that when all JS loaded for all pages Svelte code size was actually larger than Elm’s which suggests that perhaps Svelte doesn’t scale on size as well with components. Most benchmarks incentivize you to do all the work in a single component. From there AppRun is at around 18kb for the whole app, making it the winner for non-code split libraries.

Edit 3/24/2020: Since this article was published Solid has shrunk another kb to 11.1 kb.

Conclusion: All things considered things are going in the right direction. React Redux at one point made Angular seem huge, and now an implementation for libraries like Solid is almost 20 times smaller.

## Lines of Code

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*7lGPwIsW7XphclmuB1hk-g.png)*Lines of Code (Lower is Better)*

Svelte definitely keeps to its reputation here. Perhaps surprisingly the next 4 libraries all use JSX, followed by Vue and Angular’s string templates, then one more JSX library and then finally Elm. Elm is a behemoth on lines of code. It almost doubles everything else. But a quick look at the source shows why as it is written more vertically. Solid also has a higher LOC amount compared to its size. I decided to graph it(see below)but not sure it means anything. I blame Prettier I guess.

Conclusion: Still unclear if this LOC actually means anything.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*nHxuWg6PkvZhBiA2cgEhOA.png)*Size/LOC (kb/LOC*1000)*

## A “Real World” Demo??

Well sort of. Solid follows in a long tradition of minimalism in the demo. No use of a 3rd party AJAX party library. A router written in a few dozen lines. No global state management system. No form validation library.

Still, a lot to showcase here. The app makes good use of Solid’s primitive’s in the store along with the Context API to create something as slick as you might expect to find in an external library. The app makes full use of Suspense with Lazy Components and Data Fetching. In particular, Render as You Fetch techniques where data fetching is initialized upon resolution of the route in the main chunk, and data and code are fetched at the same time. If the code loads first it starts rendering off-screen with Suspense completing only when the data arrives.

I will write a follow-up article explaining the code and process. But that’s it for now. Check out Solid and be sure to check out the demo app yourself. Til next time.

## ryansolid/solid-realworld

### Solid.js codebase containing real world examples (CRUD, auth, advanced patterns, etc) that adheres to the RealWorld…

github.com

## ryansolid/solid

### A declarative, efficient, and flexible JavaScript library for building user interfaces. - ryansolid/solid

github.com

## The Fastest Way to Render the DOM

### Is the Virtual DOM, Tagged Template Literals, or Fine Grained Observables the fastest?

medium.com