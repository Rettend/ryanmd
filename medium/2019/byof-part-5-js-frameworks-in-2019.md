---
title: B.Y.O.F. — Part 5: JS Frameworks in 2019
lastmod: 2019-01-30
source: https://ryansolid.medium.com/b-y-o-f-part-5-js-frameworks-in-2019-deb9c4d3e74
---

# B.Y.O.F. — Part 5: JS Frameworks in 2019

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/?source=post_page---byline--deb9c4d3e74---------------------------------------)[Ryan Carniato](/?source=post_page---byline--deb9c4d3e74---------------------------------------)Follow7 min read·Jan 31, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2Fdeb9c4d3e74&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fb-y-o-f-part-5-js-frameworks-in-2019-deb9c4d3e74&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--deb9c4d3e74---------------------clap_footer------------------)154

1

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fdeb9c4d3e74&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fb-y-o-f-part-5-js-frameworks-in-2019-deb9c4d3e74&source=---header_actions--deb9c4d3e74---------------------bookmark_footer------------------)Listen

Share

This article concludes the Bring Your Own Framework Series. It reflects on the work done and where things are going in the future. You can read the previous articles here: [Part 1](https://medium.com/@ryansolid/b-y-o-f-part-1-writing-a-js-framework-in-2018-b02a41026929), [Part 2](https://medium.com/@ryansolid/b-y-o-f-part-2-web-components-as-containers-85e04a7d96e9), [Part 3](https://medium.com/@ryansolid/b-y-o-f-part-3-change-management-in-javascript-frameworks-6af6e436f63c), [Part 4](https://medium.com/@ryansolid/b-y-o-f-part-4-rendering-the-dom-753657689647).

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*AF1T0pbP2cjkyaounFLvyQ.jpeg)
It was almost exactly a year ago when I finally realized that the independent work I had been doing could all come together as something. I knew there was a lot about the current JS ecosystem that I felt could be better, and that things like Web Components were really coming into their own. Still I thought things had started to stabilize. I never expected the big players to weigh in on the things I cared about. 2019 is shaping up to be a much more interesting year than I could have ever expected.

So after writing a JS Framework for the majority of 2018, where do I feel this has all landed? What have I achieved and what have I learned through the process? I’m going to review the past year and give some insights into where I feel things are going.

## Declarative Data

Declarative Data came in hard and fast in the closing months of 2018. Vue 3.0 is exposing its observable primitives, and React Hooks are providing an API that is awfully familiar to anyone who has ever programmed with KVO libraries. MobX and Vue are both switching over to ES Proxies for increased performance and API transparency. This programming paradigm is incredibly powerful, and as a Knockout developer something I’ve enjoyed for the better part of a decade. This approach coming out to the forefront is very welcome. I go into this in more detail in my other post: [Why React Hooks: A Declarative Data Love Story](https://medium.com/@ryansolid/why-react-hooks-a-declarative-data-love-story-bcaa73d61389).

As for my foray into Declarative Data I couldn’t be happier. I started last year justifying every decision I was making only to have the industry validate it. Furthermore the Virtual DOM or any top down approach has constraints that limit the potential, are nowhere to be found in my State library:

## ryansolid/solid

### A declarative, efficient, and flexible JavaScript library for building user interfaces.

It has all the read/write segregation and explicit API of React Hooks, without the constraints of the Component lifecycle. This makes it infinitely more flexible yet no more complicated. In React or Vue the boundaries of change are still the Components. Want more granularity break apart more components. Where in Solid the hooks can be responsible for re-rendering as much or little as makes sense.

The inclusion of a reconcile method solves all the classic issues with KVO putting Solid in the same performance category as the fastest VDOM libraries even in those data dump scenarios. The use of proxies to determine what properties are being observed offers an unparalleled performance for the familiar approach. Honestly my biggest consideration right now is how to best showcase this library. Thus far I’ve been really trying to showcase the ergonomics in benchmarks and have been scoring really well. So even though I could write an even faster implementation I hesitate. I like that Solid is not only generally among the fastest in the benchmarks and examples. But that it has the most compact and least LOC. I was a Coffeescript guy back in the day and I dislike unnecessary boilerplate. Even with the bloat of JSX it is compact and terse. I might code a bit aggressively on whitespace, but I’m not talking a few lines. Solid is often 1.5–4x less code in simple scenarios. Look at the [JS Framework Benchmark](https://github.com/krausest/js-framework-benchmark) implementation.

Yep that’s the whole implementation. Many libraries have 300+ LOCs and Solid does it in 69. The same holds true for TodoMVC or whatever example I’ve come across.

## Winning at Benchmarks

I was not expecting over the course of the past year to come across a completely new and more performant way to render the DOM than the KVO methods I’d been working on. The author of [Stage0](https://github.com/Freak613/stage0) and [DomC](https://github.com/Freak613/domc) proved there was a faster way to render the DOM than was previously understood. I think we are yet to see the right patterns in that domain to yield a fully functional framework but I’ve definitely been working in that area. Surprisingly it is not the fastest approach I have currently as DOM reconcilers without more sophisticated change detection do have the trade off of being slower in nested partial updates, which if you refer to JS Frameworks Benchmarks hurts their Partial Updates and Select Row scores. In so an optimized Solid implementation, while slower in many areas, is on average faster across the board. I haven’t submitted it yet, because I believe in the ergonomics more than the top spot. But it is something [I’m definitely considering](https://github.com/ryansolid/solid/issues/15).

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeMore so its acknowledging today’s fastest performance is not tomorrows. And fast is fast. I still read articles everyday claiming Framework X is fast without any basis.The amount of misinformation about performance is astounding. The major frameworks in terms of kb weight, memory, and render performance in many scenarios are significantly less performant. You don’t use Angular, Vue, or React for performance. But are they performant enough in most cases? Most definitely.

I did learn some interesting stuff that is worth sharing when trying to understand DOM reconciler performance which defies common logic. It is often fastest in these libraries to memoize values at the furthest leaves and traverse everything rather than try to memoize higher up to prevent deeper execution. This seems a bit insane and this memoization would be necessary with nested component structures, but in the simple case the overhead isn’t worth it. I came up with a way to auto track state deps in a top down system like this wrapping immutable state in proxies but it was noticeably slower. In any case in its current state we have a good concept and not much else. Where I’ve been able to prove the general KVO performance argument quite well with my library:

## ryansolid/babel-plugin-jsx-dom-expressions

### A JSX to DOM plugin that wraps expressions for fine grained change detection …

github.com

All implementations from Solid, through KO JSX and MobX JSX show good numbers in the JS Frameworks Benchmark. In the case of Knockout I’m talking an old and bloated library. Yet this approach launches it to being among the fastest implementations.

But most importantly by abstracting the common parts as I tweak and enhance the functionality of the compiler it instantly affects each library’s runtime. I’ve been able implement Fragments, Event Delegation, Control flow, and Custom Directives. Its the easiest way to take any fine grained KVO library and put it at a performance level the fastest Virtual DOM libraries could keep up without sacrificing the modern features you’ve come to expect.

## Bring Your Own Framework

I’m not sure the community at large is ready for this idea. People like the comfort of frameworks. Even as libraries like SkateJS continue to come out, I haven’t seen anyone else take this idea any further. It’s possible Declarative Data patterns could open this up, but as long as people view the components as the only Change Management system the idea doesn’t quite make it through. Trying to account for KVO Change Management that doesn’t work well with Bring your Own Renderer libraries was the main reason I continued with my component library:

## ryansolid/component-register

### A simple wrapper for HTML Web Components.

It has definitely gotten the least attention of the 3 libraries I made to envision the modern framework, when it is arguably the most mature and the most important in the sense it enables the BYOF mentality. The biggest changes this year was to add hook like capabilities as an alternative method to Higher Order Components (HOCs) to compose behaviors, and adding a Context API for dependency injection. I suspect the answer is that re-usable top down change libraries aren’t as prevalent. Absence examples with the usual suspects like LitHTML probably doesn’t help.

I’ve started looking into if patterns for non-KVO are as universal. I think the challenge is that since it’s so mix and match I could probably take Component Register and LitHTML and swap in a number State Management options to make the combination that I feel is best but any single implementation would be opinionated and wouldn’t represent the capabilities of the Library or the approach. The advantage is how easy it is to adopt the lastest approaches side by side with older components and never be forced to go through a framework change on any schedule other than your own.

As for Solid, [Solid Element](https://github.com/ryansolid/solid/tree/master/packages/solid-element) leverages this library with Solid in a way that adds Context and Portals bringing it up to a level that for all its simplicity has an equivalent to the core functionality of a library like React. Since it is compatible with a reasonable amount of Reacts Global ecosystem it can be a viable alternative to building full fledged Web Applications.

## Wrapping Up

I couldn’t be happier with the work I did this past year. Not only did I learn a lot I think I’ve created something that is compelling in a lot of ways. It’s light, compact, powerful, and performant. It is class leading in each of those areas. More than that, I did so by creating re-usable pieces that voltron together to create the whole framework. Solid the state change library is arguable the most opinionated but both Component Register and JSX DOM Expressions work in a way to support many combinations of libraries. Even Solid could switch out it’s renderer without much effort.

I do think that in terms of BYOF, we aren’t really here yet, and it’s possible this will never be a thing but I’ve continued to write libraries using different techniques and all the pieces all just play together mixing and matching. I probably need to make more concrete examples to showcase the potential here but the speed at which I can incorporate new ideas and approaches is testimony to this. Not everyone is going to be changing their local State Management mechanism or Renderer every week but having the option to is very powerful in terms of buy in. Especially in a world of Code Splitting, and micro Libraries. You can really just choose the right tool to the job without feeling like you need to wrestle with your framework.

This draws an end to this series but I intend to continue to produce more dedicated content around specific techniques used in JS Frameworks and examine the power of what you can do with these libraries. Please check out the repositories and give them a star.