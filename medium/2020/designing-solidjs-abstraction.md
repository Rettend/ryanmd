---
title: Designing SolidJS: Abstraction
lastmod: 2020-02-05
source: https://ryansolid.medium.com/designing-solidjs-abstraction-66d8c63fa7d1
---

Member-only story

# Designing SolidJS: Abstraction

## Developer Experience is an area with a lot of tradeoffs. How can we possibly find the right balance?

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](https://ryansolid.medium.com/?source=post_page---byline--66d8c63fa7d1---------------------------------------)[Ryan Carniato](https://ryansolid.medium.com/?source=post_page---byline--66d8c63fa7d1---------------------------------------)Follow11 min read·Feb 6, 2020[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fgitconnected%2F66d8c63fa7d1&operation=register&redirect=https%3A%2F%2Flevelup.gitconnected.com%2Fdesigning-solidjs-abstraction-66d8c63fa7d1&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--66d8c63fa7d1---------------------clap_footer------------------)241

1

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F66d8c63fa7d1&operation=register&redirect=https%3A%2F%2Flevelup.gitconnected.com%2Fdesigning-solidjs-abstraction-66d8c63fa7d1&source=---header_actions--66d8c63fa7d1---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*mCsos-p1uJpmkzM-E6grMw.jpeg)*White Lantern Lot by [Evgeny Tchebotarev](https://www.pexels.com/@evgeny-tchebotarev-1058775)*

[SolidJS](https://github.com/ryansolid/solid) is a high-performance JavaScript UI Library. This article series goes deep into the technology and decisions that went into designing the library. You do not need to understand this content to use Solid. Today’s article focuses on Solid’s approach to abstraction.

It’s taken quite a while for me to write my first article of 2020. And in that vein, I wanted to reflect a bit on what has changed over the past 10 years and how that influenced Solid’s design. I’ve always stated that Solid is simply built on the work that has happened in the past (much of it a decade ago). But what makes it stand out is combinations of certain choices that conventional logic would lead you to be incompatible and thus impossible.

I’ve covered many of these topics in the other Designing SolidJS articles(See links below). I still find the need often to explain these choices even to fans and those familiar with reactive libraries. Many people join the “dark side” to escape React, and something like Svelte offers this return to a simpler time developer experience, yet I’m constantly praising and emulating React’s API decisions. I’ve also received suggestions and criticism for Solid not being as…