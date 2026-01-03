---
title: B.Y.O.F. — Part 1: Writing a JS Framework in 2018
lastmod: 2018-11-09
source: https://ryansolid.medium.com/b-y-o-f-part-1-writing-a-js-framework-in-2018-b02a41026929
---

# B.Y.O.F. — Part 1: Writing a JS Framework in 2018

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/?source=post_page---byline--b02a41026929---------------------------------------)[Ryan Carniato](/?source=post_page---byline--b02a41026929---------------------------------------)Follow5 min read·Nov 10, 2018[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2Fb02a41026929&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fb-y-o-f-part-1-writing-a-js-framework-in-2018-b02a41026929&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--b02a41026929---------------------clap_footer------------------)128

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fb02a41026929&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fb-y-o-f-part-1-writing-a-js-framework-in-2018-b02a41026929&source=---header_actions--b02a41026929---------------------bookmark_footer------------------)Listen

Share

I’ve been tinkering around with related technologies for a few years now, and tried to reverse engineer many of the popular libraries, but it wasn’t until earlier this year I really decided to pull it all together into something. Things just sort of aligned. Modern Browsers are pretty much here. Web Components are actually finally arriving (Edge is the last and it’s in dev). But most importantly there is a clear gap right now between people using this new technology, applying it to how they know how to do things, and letting the technology define what they can do.

I didn’t set out to write a Framework. In fact I don’t think of my work here as a Framework in a classic sense. The JS Framework of 2018 is new type of Framework in it isn’t necessarily new at all.

B.Y.O.F — Bring Your Own Framework

![](https://miro.medium.com/v2/resize:fit:5616/1*2RUxn07xelWm-oyv99-Tfg.jpeg)
If you have worked in JS in the past decade you’ve definitely seen the rate at which things have progressed outpaced a software project’s ability to stay current. From Angular’s transformation to Angular 2 to the React community figuring out monthly what the best way to do dependency injection is. For a couple years there we couldn’t even agree on a good way to store our application state. And don’t get me started on which Redux middleware is the least compromising. Some people call that fatigue inducing, I call it a sign of healthy community and built on innovative ideas.

But it hasn’t been without cost. Every time React deprecates a lifecycle function people have PTSD flashbacks. When Dan Abramov writes a Blog on a new React feature he has to caution people not to get too excited. It’s hard to be a large framework and keep things simple while being cutting edge. This is not a problem that just goes away. The best you can do is not force everyone through a painful upgrade. All things being fair React has done an amazing job of it. And while there are many reasons for their success one simple thing sticks out.

React the library mostly does one thing and does that one thing well.

It’s the ecosystem around it that makes it a full fledged framework. This frees the developers to focus on what’s important and it allows the community to do the experiments. As much as it may be impossible to be cutting edge all the time, you never needed to do an Angular2 level migration. It may happen one day and React as it has been incorporating more of the communities efforts internally risks this more and more.

React wasn’t the first javascript “Just a Render Library”. I attribute that honor to a much older library, [KnockoutJS](https://knockoutjs.com/). It didn’t come with the same rhetoric and backing as React, but it wears the mantle much better. Knockout didn’t have components but identified an application was built from 3 parts Model, ViewModel, and View and truly only cared about how you organized the latter. The ViewModel was a revolutionary concept for the client at the time as most libraries were MVC where Controllers are generally singletons and incapable of representing state cleanly. ViewModels are instances much like components, but what set Knockout apart was ViewModels could be anything you wanted; an object, a function, a class(well not in 2010, unless you were using Coffeescript). There were no lifecycle functions. You could bring your own models and organize your application as you saw fit. All you had to do was declare your data and bind it. Without best practices it could be a complete mess. But it was truly “Just a Render Library.”

The COO for the company I worked for back in 2013 was very tech minded and facilitated moving our Knockout powered Single Page Application into Web Components. It was a natural fit as Knockout didn’t care about the container it was in, and with a few custom wrappers we were able come up with a pretty powerful system. In 2014 we migrated our Backbone Data Models to Flux Stores. In fact we successfully made several migrations as trends updated on a system that was mostly developed in 2011. In fact it’s still in Production today. The key to this was understanding the natural boundaries. The most expensive part of refactoring something is when you have to change where one part ends and the next begins. Our COO was either a genius or pretty lucky.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeWhat I learned from the experience was those boundaries haven’t changed really in over a decade. They have been the one constant. As Controllers transformed to Routers, and Models to Stores, and ViewModels and Views got wrapped together as Components, the anatomy of a Component still is 3 main parts.

- Container
- Change(Local State) Manager
- Renderer

Even a smaller library like React is responsible for all 3. But this is a natural separation that is fine grained enough to not tie you to any specific solution/opinion. More so by mixing and matching these 3 (along with external stores/routing) you can have exactly the framework you are looking for without necessarily having to write it yourself. That is as long as the Container which serves as the interopt point is something you can bank on. Web Components are a good candidate for those containers as they are standardized and available.

The past few years have seen the rise of micro-libraries for Rendering. Stefan Krause’s [JS Framework Benchmark](https://github.com/krausest/js-framework-benchmark) is like a smorgasbord of possibilities. Libraries vary from full frameworks like Angular to super light DOM wrappers that handle little more wrapping array reconciliation methods. It is run on an example that is like an overworked TodoMVC that gives enough of the DX ergonomics that you can make a surface judgement. Like all benchmarks this isn’t completely realworld accurate but in terms of benchmarks this is one of the best to understand performance characteristics from technology design choices.

With that I had the baseline to my journey. In my next posts I will take you through what it means to build out a B.Y.O.F. and further dig into the decisions and libraries I have written to realize this goal.

The other parts of the series can be found here:

## B.Y.O.F. — Part 2: Web Components as Containers

### This post continues the Bring Your Own Framework journey I took to create a modern JS Framework. In Part 1, which can…

medium.com

## B.Y.O.F. — Part 3: Change Management in JavaScript Frameworks

### This post continues the Bring Your Own Framework journey I took to create a modern JS Framework. In Part 1, I outlined…

medium.com

## B.Y.O.F. — Part 4: Rendering the DOM

### This article continues the Bring Your Own Framework Series exploring choosing your renderer. You can find the previous…

medium.com

## B.Y.O.F. — Part 5: JS Frameworks in 2019

### This article concludes the Bring Your Own Framework Series. It reflects on the work done and where things are going in…

medium.com