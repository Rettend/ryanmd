---
title: Designing SolidJS: Reactivity
lastmod: 2019-09-17
source: https://ryansolid.medium.com/designing-solidjs-reactivity-75180a4c74b4
---

Member-only story

# Designing SolidJS: Reactivity

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](https://ryansolid.medium.com/?source=post_page---byline--75180a4c74b4---------------------------------------)[Ryan Carniato](https://ryansolid.medium.com/?source=post_page---byline--75180a4c74b4---------------------------------------)Follow12 min read·Sep 18, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fitnext%2F75180a4c74b4&operation=register&redirect=https%3A%2F%2Fitnext.io%2Fdesigning-solidjs-reactivity-75180a4c74b4&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--75180a4c74b4---------------------clap_footer------------------)350

5

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F75180a4c74b4&operation=register&redirect=https%3A%2F%2Fitnext.io%2Fdesigning-solidjs-reactivity-75180a4c74b4&source=---header_actions--75180a4c74b4---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*-UZfIutjYQDIHFFOUR3jzQ.jpeg)*IStock*

[SolidJS](https://github.com/ryansolid/solid) is a high performance JavaScript UI Library. This article series goes deep into the technology and decisions that went into designing the library. You do not need to understand this content to use Solid. Today’s article focuses on Solid’s reactive system.

The hot button topic of Frontend Development in 2019. A lot of credit for that goes to [Svelte](https://svelte.dev/) and Rich Harris ([Rethinking Reactivity](https://svelte.dev/blog/svelte-3-rethinking-reactivity)). He wasn’t the first one to say it and members of React’s own team have, including Dan Abramov:

React isn’t completely Reactive

I don’t think we should be so hard on [React](https://reactjs.org/). At this point I think a lot of people in the audience are asking, “What does Reactive even mean anymore?” There is the academic Functional Reactive Programming (FRP), like RxJS, that deals with data streams. There are UI libraries like MobX or [Svelte](https://svelte.dev/). And then, of course, there is [React](https://reactjs.org/). I’ve read a number of explanations like the old wikipedia answer:

Reactive programming is a [programming paradigm](https://en.wikipedia.org/wiki/Programming_paradigm) oriented around [data flows](https://en.wikipedia.org/wiki/Dataflow_programming) and the propagation of change. This means that it should be possible to express static or dynamic data flows with ease in the programming languages used, and that the underlying execution model will automatically propagate changes through the data flow.