---
title: OOP with Functions in JavaScript
lastmod: 2019-03-01
source: https://ryansolid.medium.com/oop-with-functions-in-javascript-a3ec30e4750a
---

Member-only story

# OOP with Functions in JavaScript

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/?source=post_page---byline--a3ec30e4750a---------------------------------------)[Ryan Carniato](/?source=post_page---byline--a3ec30e4750a---------------------------------------)Follow5 min read·Mar 2, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2Fa3ec30e4750a&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Foop-with-functions-in-javascript-a3ec30e4750a&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--a3ec30e4750a---------------------clap_footer------------------)55

2

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fa3ec30e4750a&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Foop-with-functions-in-javascript-a3ec30e4750a&source=---header_actions--a3ec30e4750a---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*Dk_c6Kwi4JaIxYDlvE3NfQ.png)
The JavaScript community is constantly a hotbed for heated discussions over best paradigms, hippest frameworks, and coolest opinions. Honestly, I think it’s great, to have some an open and enthusiastic community. You have people coming in at all experience levels finding a place where they can immediately participate and more importantly contribute. But the number of times these discussions devolve into argument of semantics is far more often than I’d like.

I want to deconstruct OOP from the perspective of using Function primitives. This isn’t strictly Functional programming. I just want to illustrate that value of OOP can be achieved piece-wise without subscribing to language specific constructs like Classes, which in the case of JavaScript are actually insufficient to fulfill the primary needs. I’ve heard this referred to as Factory Oriented programming. But really it’s just another perspective on a classic problem. And perhaps a better understanding of JavaScript comes with this journey.

## So what is OOP?

Go do a google search. Wikipedia will tell you:

Object-oriented programming (OOP) is a [programming paradigm](https://en.wikipedia.org/wiki/Programming_paradigm) based on the concept of “[objects](https://en.wikipedia.org/wiki/Object_(computer_science))”, which can contain [data](https://en.wikipedia.org/wiki/Data), in the form of [fields](https://en.wikipedia.org/wiki/Field_(computer_science)) (often known as attributes), and code, in the form of procedures (often known as [methods](https://en.wikipedia.org/wiki/Method_(computer_science))).