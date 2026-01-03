---
title: Finding Fine-Grained Reactive Programming
lastmod: 2019-06-30
source: https://ryansolid.medium.com/finding-fine-grained-reactive-programming-89741994ddee
---

Member-only story

# Finding Fine-Grained Reactive Programming

## Getting a grip on the front-end epidemic of 2019, being rapidly adopted by React, Vue, and Svelte

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](https://ryansolid.medium.com/?source=post_page---byline--89741994ddee---------------------------------------)[Ryan Carniato](https://ryansolid.medium.com/?source=post_page---byline--89741994ddee---------------------------------------)Follow15 min read·Jul 1, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fgitconnected%2F89741994ddee&operation=register&redirect=https%3A%2F%2Flevelup.gitconnected.com%2Ffinding-fine-grained-reactive-programming-89741994ddee&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--89741994ddee---------------------clap_footer------------------)276

1

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F89741994ddee&operation=register&redirect=https%3A%2F%2Flevelup.gitconnected.com%2Ffinding-fine-grained-reactive-programming-89741994ddee&source=---header_actions--89741994ddee---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*y2vTNzUoWlMuTmzrxAiIPg.jpeg)*Desert Dune Focus from Pexels.com*

Something has been happening in the front-end world this past year that has left a lot of developers confused. Just when ES6 Classes had become ubiquitous, popular libraries are abandoning them at a rapid rate. Just when things were starting to feel like they were settling down this curveball seemed to come out of nowhere.

What I’m talking about are these functional Components with things called Hooks, and Computeds. I’m talking about this recent [Vue RFC](https://github.com/vuejs/rfcs/blob/function-apis/active-rfcs/0000-function-api.md). Things like observable data and explicit dependency declarations. The slew of on_____ and use_____ that are sure to cover your screens for years to come.

The truth is, this isn’t out of nowhere. Although why this suddenly exploded now is a mystery to me as much as the next person. We are talking about a programming paradigm that was gaining steam on the front-end before React showed up on the scene but then lay mostly dormant for the past 5 years. However, I’m one of those poor souls that continued to use this swearing up and down it was the superior pattern to develop front-end UI both for developer experience and performance. So who better to introduce you to your new overlords?