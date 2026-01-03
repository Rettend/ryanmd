---
title: Understanding JavaScript UI Benchmarking
lastmod: 2019-10-16
source: https://ryansolid.medium.com/understanding-javascript-ui-benchmarking-afe4278b4b46
---

Member-only story

# Understanding JavaScript UI Benchmarking

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](https://ryansolid.medium.com/?source=post_page---byline--afe4278b4b46---------------------------------------)[Ryan Carniato](https://ryansolid.medium.com/?source=post_page---byline--afe4278b4b46---------------------------------------)Follow8 min read·Oct 17, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fjavascript-in-plain-english%2Fafe4278b4b46&operation=register&redirect=https%3A%2F%2Fjavascript.plainenglish.io%2Funderstanding-javascript-ui-benchmarking-afe4278b4b46&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--afe4278b4b46---------------------clap_footer------------------)173

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fafe4278b4b46&operation=register&redirect=https%3A%2F%2Fjavascript.plainenglish.io%2Funderstanding-javascript-ui-benchmarking-afe4278b4b46&source=---header_actions--afe4278b4b46---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*xAYyZkenbEzG5TtlaOJUWg.png)*Official JS Framework Benchmark Results — Chrome 75*

It seems every time there is a new UI Framework or a new feature in your favourite Framework we are shown a new Benchmark showcasing how we are witnessing the next big thing. But fear not. All these fancy tests and benchmarks boil down to 3 categories. Understanding that you will be able to properly discern what the benchmarks are showing, and what value you should put on them. When it comes down to it, regardless of what shiny new thing that will revolutionize the developer experience, these libraries are responsible for ultimately doing one thing: Rendering the screen. I’m going to keep things introductory but if you want to dig deeper into the technical details I strongly recommend reading:

## How to win in Web Framework Benchmarks

### Two years ago I’ve started my journey to explore Virtual DOM and wrote kivi library. This library is using key ideas…

medium.com

I’m going to focus on runtime benchmarks not loading benchmarks. Loading and size benchmarks are important. However, unless you are serving a static site only make up a small part of the performance characteristics. Yes, first impressions are everything but don’t confuse TTI (Time to Interactive) with general performance.