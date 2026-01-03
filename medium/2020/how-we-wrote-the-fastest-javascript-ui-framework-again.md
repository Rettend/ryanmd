---
title: How we wrote the Fastest JavaScript UI Framework, Again!
lastmod: 2020-09-17
source: https://ryansolid.medium.com/how-we-wrote-the-fastest-javascript-ui-framework-again-db097ddd99b6
---

# How we wrote the Fastest JavaScript UI Framework, Again!

## This time we conquered the Server.

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](https://ryansolid.medium.com/?source=post_page---byline--db097ddd99b6---------------------------------------)[Ryan Carniato](https://ryansolid.medium.com/?source=post_page---byline--db097ddd99b6---------------------------------------)Follow6 min read·Sep 18, 2020[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fgitconnected%2Fdb097ddd99b6&operation=register&redirect=https%3A%2F%2Flevelup.gitconnected.com%2Fhow-we-wrote-the-fastest-javascript-ui-framework-again-db097ddd99b6&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--db097ddd99b6---------------------clap_footer------------------)2K

2

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fdb097ddd99b6&operation=register&redirect=https%3A%2F%2Flevelup.gitconnected.com%2Fhow-we-wrote-the-fastest-javascript-ui-framework-again-db097ddd99b6&source=---header_actions--db097ddd99b6---------------------bookmark_footer------------------)Listen

Share

![](https://miro.medium.com/v2/resize:fit:5027/1*X2hFe2aJkXVKFS1ymo1d2A.jpeg)*Man Riding Bike by Hilmi Bana on pexels.com*

I have a process. I apply this to almost any sort of problem I face.

Step 1. Define the problem

This for me often takes the longest. It is absolutely critical to understand what you are trying to solve, who stakeholders are, and what's actually important.

Step 2. Propose an idealized solution no matter the cost

No.. “but”s just pure and simple how this should work if everything could go your way.

Step 3. Throw it all away and reframe the original question

I find this absolutely necessary to exhaust the prescribed train of thought so that I break apart all my initial assumptions. Only now can the real work begin.

## Solid on the Server

[SolidJS](https://github.com/ryansolid/solid) is a JavaScript library like React, Vue, or Angular designed to efficiently render Web UIs. It supports all the modern feature sets including first-class TypeScript support, Granular Reactivity, Async Concurrency, and JSX/Tagged Literal templating. It has also been the most performant rendering library in the browser for the last 3 years consistently topping benchmarks.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*06inWyjwfQJxhf6J9KVLRw.png)*Official [JS Framework Benchmark](https://github.com/krausest/js-framework-benchmark) Chrome 85*

So what is the next horizon for Solid? Server Rendering was an obvious topic and the most requested feature at the time. This was a much harder task. First I needed to find out what makes the fastest Server Side renderer, and I came across [MarkoJS](https://markojs.com/). Used in production by eBay, they have a solution for JS on the server unmatched by any other library.

And they had one of only SSR benchmark suites that I’d seen that had a nice variety of implementations. So I had a place to start my learning…

## Benchmarking on the Server

So I cloned the repo (Source found [here](https://github.com/ryansolid/isomorphic-ui-benchmarks/tree/article)). 2 simple tests. A color picker, and an e-commerce style search results page. You may have seen these before on the [MarkoJS Website](https://markojs.com/).

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*lk2cUAlYUCSxNOL1kZpxpA.png)*Search Result SSR Performance*

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*P_K2ma2widqlMH4iTYTlRw.png)*Color Picker SSR Performance*

I implemented the samples, built,.. and… well the results were dismal. Like terribly poor. I was using DOM environments on the server(JSDOM, BasicHTML) and they just weren’t coming close to even the slowest libraries. Like 10x slower.

I looked into a few approaches like [Andrea Giammarchi](https://medium.com/u/cc83da4b8256?source=post_page---user_mention--db097ddd99b6---------------------------------------)’s Heresy SSR, and realized while this would work well for a top-down template library it didn’t make sense for a reactive one. It wasn’t just the faux DOM was being a problem. I had the reactive graph to contend with as well.

So I looked at Svelte the only other reactive library in the benchmark and realized everyone was just rendering strings ultimately. Obvious in hindsight. Both Svelte and Marko had removed any intermediate layer. So that was the answer, compile to a different non-reactive runtime. I wasn’t really happy about this though.

Without a reactive system how do we ever update on the server? How do we handle Async Data Loading? Load it all ahead then render synchronously? That isn’t an isomorphic experience. Having different mental models between client and server is brings way too much perceived complexity.

Ultimately I realized I should rely on Solid’s strengths. Being the fastest client-side renderer had already closed the performance gap with server rendering. I realized I could use the same resources that I use for Suspense on the client to stream the values from the server and have the client render everything after the first shell.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeIn this way, we solve the double data problem, and remove the need for nested hydration, while leveraging faster initial paint and async request starts. I cover how this works in more detail in my article on [indepth.dev](https://indepth.dev/):

## The Journey to Isomorphic Rendering Performance

### I'm the author of the SolidJS UI Library, known for being one of the most performant libraries in the browser. I knew…

indepth.dev

More importantly, it freed me of this constraint and I could focus on performant synchronous rendering.

## And…

I wrote a new compiler and a new runtime. I tuned it and I tuned it. And gave it a good old run and… alas I was 3rd. Just below Inferno. Respectable. I shaved hundreds of milliseconds here and there, but ultimately I knew I had a limit.

See Marko or Svelte are languages. They can analyze the grammar and don’t have extra function wrappers they need to execute, their templates are not JSX that can accept every value. They know exactly what to escape and not.

I needed to arbitrarily wrap any insertion as it could be who knows what. There is just a theoretical maximum performance even I could do with having such a dynamic system. I looked at similar approaches of blueprints that VDOM libraries were using for performance but nothing really worked here.

SSR performance as it turns out is not about finesse. There is nothing clever here. In the browser, we do this dance to avoid DOM operations. On the server it’s about how fast you can mash strings together.

## Not the end of the Story…

I had resigned myself to having respectable performance when a contributor made a pull request that read: “[Increase escapeHTML performance up to 10 times!](https://github.com/ryansolid/dom-expressions/pull/27)”. I was in disbelief. I had made my escape function using a combination of what I thought was Svelte and Marko’s approach and thought I was in pretty good place.

It turns out it could be way faster. I updated my library and sure enough with the escaping bottleneck removed Solid was flying.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*Vh_llklnwzjdUcOYOfLf4A.png)*Search Results SSR Performance*

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*KFIEZk9gxKE_IDgeUt57kQ.png)*Color Picker SSR Performance*

So you could say that we lucked into being the fastest for the 2nd time now thanks to the community again. What good was my process? Not sure. I didn’t give up before I started.

## What comes Next?

See what I did? No, I don’t personally have plans to make a Next.js library for Solid, but I’d love to see one built. Today I’m going to just reflect on what was accomplished here thanks to help from open source community.

I’m under no illusions here. Solid’s approach will not let it stay absolute fastest on the Server. I know this from personal experience as a member of the MarkoJS core team (I was so impressed with their work I joined up). A benchmark like this doesn’t properly reflect the complexity of hydration either. But I like to raise the bar where I can.

A year ago at the end of the “How we wrote the Fastest JavaScript UI Frameworks”. I made a list of todos that we have almost completed. Solid now has Streaming Suspense Aware SSR with Data Loading and Code Splitting, Concurrent Rendering and Transitions (in beta), and [A Realworld Demo](/a-solid-realworld-demo-comparison-8c3363448fd8). CLI tools, REPLs, 3rd party libraries for i18n. Stuff is coming along.

We still have a long way to go as community. We hit 4k Stars this week on Github and 75k downloads on NPM. Performance and benchmarks is hardly everything. But until told otherwise I’m going to keep pushing the boundaries.

The source code for the benchmark in this article is currently on a fork of the Isomorphic UI Bencharks found here:

## ryansolid/isomorphic-ui-benchmarks

### This repo includes multiple benchmarks for various UI libraries. Each benchmark is designed to measure rendering…

github.com

## ryansolid/solid

### A declarative, efficient, and flexible JavaScript library for building user interfaces. - ryansolid/solid

github.com

## How we wrote the Fastest JavaScript UI Frameworks

### I’m sure you’ve been there at one point. You had a great idea. Something novel. Something new. Yet something impactful…

medium.com

## A Solid RealWorld Demo Comparison of JavaScript Framework Performance

### SolidJS enters the ring as the newest challenger in the RealWorld Demo. Let’s see how it stacks up.

levelup.gitconnected.com

## Level Up Coding

Thanks for being a part of our community! [Subscribe to our YouTube channel](https://www.youtube.com/channel/UC3v9kBR_ab4UHXXdknz8Fbg?sub_confirmation=1) or join the [Skilled.dev coding interview course](https://skilled.dev/).

## Coding Interview Questions | Skilled.dev

### The course to master the coding interview

skilled.dev