---
title: React Hooks — The Most Performant Way to Write React
lastmod: 2019-03-11
source: https://ryansolid.medium.com/react-hooks-the-most-performant-way-to-write-react-393e135e1cc
---

Member-only story

# React Hooks — The Most Performant Way to Write React

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/?source=post_page---byline--393e135e1cc---------------------------------------)[Ryan Carniato](/?source=post_page---byline--393e135e1cc---------------------------------------)Follow7 min read·Mar 12, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2F393e135e1cc&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Freact-hooks-the-most-performant-way-to-write-react-393e135e1cc&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--393e135e1cc---------------------clap_footer------------------)252

2

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F393e135e1cc&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Freact-hooks-the-most-performant-way-to-write-react-393e135e1cc&source=---header_actions--393e135e1cc---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*ncx1Br05erYtinPuK2z0ow.png)*Box Plot of `Partial Update` on JS Frameworks Benchmark (lower is better)*

I like to think that I have a pretty good grasp of React Hooks at this point. I’ve been through the trials of learning all the [hidden gotchas](https://medium.com/js-dojo/react-hooks-has-react-jumped-the-shark-c8cf04e246cf) as I’ve made demos and wrote a library on top of them. This time I returned to an area I’m much more comfortable with: Benchmarking.

Stefan Krause’s [JS Frameworks Benchmark](https://github.com/krausest/js-framework-benchmark) might be the greatest holistic benchmark tool for JS library writers to find bugs, notice regressions, and tweak the last ounce performance out of their libraries. It uses a semi realistic scenario of managing operations on large lists, tracking startup time, memory profiling, and raw render performance.

So I decided to add a React Hooks implementation and its currently overall the best performing React variant. Not by a particularly large margin but I’m going to dig in further to see if we can learn anymore from the results. I’m going to compare optimized vanilla JavaScript to React, React Hooks, and React Redux. Understand that these implementations are not strictly equivalent but represent the most optimized approach for their given technology.

## The Implementation

This is not my first go at writing implementations for this benchmark. I’ve written four previously including the vanilla JavaScript implementation that we will be using as the baseline here. So…