---
title: How I wrote the Fastest JavaScript UI Framework
lastmod: 2019-02-09
source: https://ryansolid.medium.com/how-i-wrote-the-fastest-javascript-ui-framework-37525b42d6c9
---

Member-only story

# How I wrote the Fastest JavaScript UI Framework

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/?source=post_page---byline--37525b42d6c9---------------------------------------)[Ryan Carniato](/?source=post_page---byline--37525b42d6c9---------------------------------------)Follow5 min read·Feb 10, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2F37525b42d6c9&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fhow-i-wrote-the-fastest-javascript-ui-framework-37525b42d6c9&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--37525b42d6c9---------------------clap_footer------------------)183

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F37525b42d6c9&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fhow-i-wrote-the-fastest-javascript-ui-framework-37525b42d6c9&source=---header_actions--37525b42d6c9---------------------bookmark_footer------------------)Listen

Share

![](https://miro.medium.com/v2/resize:fit:4321/1*gygMdLTedKy4-OYR2XsRBQ.jpeg)
Bold claim, I know. And tomorrow it might not even be true. But right now with the release Chrome 72, [Solid](https://github.com/ryansolid/solid) has taken the coveted top spot in the [JS Frameworks Benchmark](https://krausest.github.io/js-framework-benchmark/current.html). (Technically #5, but the top 4 implementations are handwritten “vanilla” reference implementations that has the implementor directly managing DOM API mutations.)

A lot more goes into writing a JS UI library than chasing benchmarks. I have the distinct advantage of a substantially smaller user base than most competitors. But I woke up this morning, on my Birthday no less, to see that while I’ve been spending my recent time improving compatibility and adding features, [Solid](https://github.com/ryansolid/solid) silently crept up thanks to the latest Chrome. It was the realization that as browsers get more optimized the approach taken here will only get better that has prompted me to write this article. I didn’t really invent anything new but it’s the way [Solid](https://github.com/ryansolid/solid) puts it together that makes the difference.

## 1. Pre-Compile your Views

This is a big one. While not necessarily producing the least overall code to transfer over the wire the work you do ahead of time pays dividends later. This compilation doesn’t need to happen during the build step and can happen in the client as long as you aren’t taking the cost on each update. The performance hit especially for smaller apps…