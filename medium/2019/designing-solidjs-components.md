---
title: Designing SolidJS: Components
lastmod: 2019-11-14
source: https://ryansolid.medium.com/designing-solidjs-components-8f1ebb88d78b
---

Member-only story

# Designing SolidJS: Components

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/@ryansolid?source=post_page---byline--8f1ebb88d78b---------------------------------------)[Ryan Carniato](/@ryansolid?source=post_page---byline--8f1ebb88d78b---------------------------------------)Follow11 min read·Nov 15, 2019[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fswlh%2F8f1ebb88d78b&operation=register&redirect=https%3A%2F%2Fmedium.com%2Fswlh%2Fdesigning-solidjs-components-8f1ebb88d78b&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--8f1ebb88d78b---------------------clap_footer------------------)131

1

[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F8f1ebb88d78b&operation=register&redirect=https%3A%2F%2Fmedium.com%2Fswlh%2Fdesigning-solidjs-components-8f1ebb88d78b&source=---header_actions--8f1ebb88d78b---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*L07xNP_QGkFPx19AT-fo8g.jpeg)*Quantum Tangles by Valex on Shutterstock.com*

[SolidJS](https://github.com/ryansolid/solid) is a high-performance JavaScript UI Library. This article series goes deep into the technology and decisions that went into designing the library. You do not need to understand this content to use Solid. Today’s article focuses on Solid’s Component System.

## Cost of Components

Sometimes I feel like I spend so much time in benchmarks and micro-optimizations that I might be losing touch on the actual development experience. I mean when was the last time you saw a benchmark break up the solution into Components when it wasn’t a Virtual DOM library like React? Different libraries carry different costs when approaching how to modularizing code. Yet modularization is an undeniable truth when trying to scale out any sort of solution that is more involved than a simple benchmark. Yet we rarely look at the cost there.

The truth is the cost of Components isn’t black and white. Virtual DOM libraries like React require Components to handle efficient change management and in so are built in a way that breaking code into Components has a minimal cost. In fact, doing so often improves performance. The initial rendering is already a bunch of document.createElements due to the separate HyperScript calls. And more Components just allow finer-grained memoization.