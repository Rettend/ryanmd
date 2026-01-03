---
title: Designing SolidJS: Suspense
lastmod: 2019-12-02
source: https://ryansolid.medium.com/designing-solidjs-suspense-f4e92c625cb5
---

Member-only story

# Designing SolidJS: Suspense

## React isn’t the only library capable of stopping time.

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](https://ryansolid.medium.com/?source=post_page---byline--f4e92c625cb5---------------------------------------)[Ryan Carniato](https://ryansolid.medium.com/?source=post_page---byline--f4e92c625cb5---------------------------------------)Follow9 min read·Dec 3, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fitnext%2Ff4e92c625cb5&operation=register&redirect=https%3A%2F%2Fitnext.io%2Fdesigning-solidjs-suspense-f4e92c625cb5&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--f4e92c625cb5---------------------clap_footer------------------)57

2

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Ff4e92c625cb5&operation=register&redirect=https%3A%2F%2Fitnext.io%2Fdesigning-solidjs-suspense-f4e92c625cb5&source=---header_actions--f4e92c625cb5---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*2B26VlnXo0y9XKJG--BSxA.jpeg)*Nature Water Drop from pixabay.com*

[SolidJS](https://github.com/ryansolid/solid) is a high-performance JavaScript UI Library. This article series goes deep into the technology and decisions that went into designing the library. You do not need to understand this content to use Solid. Today’s article focuses on Solid’s approach to asynchronous rendering.

Suspense and Concurrent Mode are being touted as the future of web development by many. This set of features being developed by React is poised to revolutionize how web applications are designed. But these are complicated topics and while [Dan Abramov](https://medium.com/u/a3a8af6addc1?source=post_page---user_mention--f4e92c625cb5---------------------------------------)’s series of [tweets](https://twitter.com/dan_abramov/status/1120971795425832961) have helped to promote understanding of React’s intention with these features, I still feel the general public doesn’t get it yet. More so I do not think they have any means to compare this to other approaches. So I feel like I’ve come across some key insights when developing the same feature set for a Reactive library of all things. No Virtual DOM here folks. So while I explore the nuances of Solid’s solution I hope at the same time to provide some insights on what is really going on.

## Asynchronous Rendering vs Fine-Grained Reactivity

Asynchronous Rendering, Time-Slicing, and finally Concurrent Mode have all been titles for this one feature at some point…