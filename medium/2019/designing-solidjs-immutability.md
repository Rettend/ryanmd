---
title: Designing SolidJS: Immutability
lastmod: 2019-11-17
source: https://ryansolid.medium.com/designing-solidjs-immutability-f1e46fe9f321
---

Member-only story

# Designing SolidJS: Immutability

## Can Reactive State Management be both Immutable and also the most performant?

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](https://ryansolid.medium.com/?source=post_page---byline--f1e46fe9f321---------------------------------------)[Ryan Carniato](https://ryansolid.medium.com/?source=post_page---byline--f1e46fe9f321---------------------------------------)Follow9 min read·Nov 18, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fjavascript-in-plain-english%2Ff1e46fe9f321&operation=register&redirect=https%3A%2F%2Fjavascript.plainenglish.io%2Fdesigning-solidjs-immutability-f1e46fe9f321&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--f1e46fe9f321---------------------clap_footer------------------)83

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Ff1e46fe9f321&operation=register&redirect=https%3A%2F%2Fjavascript.plainenglish.io%2Fdesigning-solidjs-immutability-f1e46fe9f321&source=---header_actions--f1e46fe9f321---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*AWq4cOky2JFSvNULK9jynA.jpeg)*Space Ice Wall from Wallpaper Abyss wall.alphacoders.com*

[SolidJS](https://github.com/ryansolid/solid) is a high-performance JavaScript UI Library. This article series goes deep into the technology and decisions that went into designing the library. You do not need to understand this content to use Solid. Today’s article focuses on Solid’s Immutable Reactive State Management.

This is always one of those divisive topics. Mutability vs Immutability, OOP vs Functional Programming, Imperative vs Declarative. I’ve previously alluded to it not being so black and white in my Dualities article. But I find this is the area that I have to defend the most when talking about APIs with Solid. I’m going to explore why Solid seems to be the only Immutable Fine-Grained Reactive library, why I was so adamant about making it that way, and why this approach outperforms any Immutable system out there.

Be warned, I’m probably going to touch on a few opinionated topics in this article and share my thoughts on them.

## Being Reactive

Reactive libraries come in a few shapes and sizes, and that tends to be an endless source of confusion when trying to define terms. On one hand, you have Rx, like RxJS, which is based on wiring streams. These libraries operate on data…