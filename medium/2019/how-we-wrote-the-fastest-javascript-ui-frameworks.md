---
title: How we wrote the Fastest JavaScript UI Frameworks
lastmod: 2019-07-25
source: https://ryansolid.medium.com/how-we-wrote-the-fastest-javascript-ui-frameworks-a96f2636431e
---

1

Top highlight

# How we wrote the Fastest JavaScript UI Frameworks

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](https://ryansolid.medium.com/?source=post_page---byline--a96f2636431e---------------------------------------)[Ryan Carniato](https://ryansolid.medium.com/?source=post_page---byline--a96f2636431e---------------------------------------)Follow5 min read·Jul 26, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fjavascript-in-plain-english%2Fa96f2636431e&operation=register&redirect=https%3A%2F%2Fjavascript.plainenglish.io%2Fhow-we-wrote-the-fastest-javascript-ui-frameworks-a96f2636431e&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--a96f2636431e---------------------clap_footer------------------)2.9K

10

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fa96f2636431e&operation=register&redirect=https%3A%2F%2Fjavascript.plainenglish.io%2Fhow-we-wrote-the-fastest-javascript-ui-frameworks-a96f2636431e&source=---header_actions--a96f2636431e---------------------bookmark_footer------------------)Listen

Share

![](https://miro.medium.com/v2/resize:fit:3591/1*Qq76zph2wDD59e2ooun6ZQ.jpeg)*Man riding bicycle on city street by Snapwire on pexels.com*

I’m sure you’ve been there at one point. You had a great idea. Something novel. Something new. Yet something impactful. You know it’s a bit ambitious, so you come up with a plan of attack. You vet the idea with a few peers. And then all that is left is to do the work.

At first, things are going well. That is until you realize things are going be a bit more complicated than initially thought. You push through and things are alright, but not really what you expected.

But then it happens. That moment when things align. A breakthrough! Things pick up steam and there is no stopping you as you propel yourself towards the goal. You pull that last all-nighter, tweaking the last little detail. Now all that is left is to push that submit button and wait.

… breath …

And then this happens:

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*M-tel3jBax1PWBaErgytLg.png)*Current Official JS Framework Benchmark Results*

Faster than Vanilla JavaScript!! What?! Is there something wrong here?

This isn’t a toy demo. This the [JS Frameworks Benchmark](https://github.com/krausest/js-framework-benchmark), arguably the most reputable benchmark for UI Frameworks of this nature. And your Framework’s optimized version is not only faster than VanillaJS, but the standard React-Friendly API version is faster than every other framework out there.

## What’s Going On?

I’m the author of [Solid.js](https://github.com/ryansolid/solid), a JavaScript UI Library that is focused on fine-grained control and brutal performance. Picture if someone crossed React with Svelte and had the child train relentlessly with Inferno. I’ve written at length on Medium about what it takes to [render the DOM efficiently](https://medium.com/better-programming/the-fastest-way-to-render-the-dom-e3b226b15ca3). But even sometimes I surprise myself. About a month ago, having gathered feedback from the issues, I decided to make a pretty drastic change to accommodate the use cases of a growing community. I threw an RFC up on Github that was met with some thumbs up and decided to spend my evenings the next several weeks doing this large refactor.

The refactor was a large effort since the underlying renderer in [Solid](https://github.com/ryansolid/solid) ([DOM Expressions](https://github.com/ryansolid/dom-expressions)) is one that I have developed to support any fine-grained reactive library. Overtime things had gotten so restrictive to allow certain performance optimizations it was limiting not only users of [Solid](https://github.com/ryansolid/solid) but users of MobX and Knockout variants. So I had come up with a plan to lose the least performance. It drastically simplified things, but would require work to be done in 2 passes; once in the reactive system, and once in the DOM reconciler.

It turns out accessing the DOM less even when that access is reserved to [safe properties](https://github.com/patrick-steele-idem/morphdom#isnt-the-dom-slow) has significant performance improvements. I’d been spinning my wheels trying to come up with the most optimal system but its complexity had stifled its performance.

Is Solid faster than vanilla(plain) JavaScript? No. This was a good run with a highly optimized framework and there is always variance. Still, these are pretty optimized vanilla implementations so it’s still impressive. [Go find your favourite Framework and see where they sit](https://krausest.github.io/js-framework-benchmark/current.html).

For those looking for the technical solution, the answer is simple. Sometimes keeping a list of DOM nodes as an array, which has overhead to keep synchronized, is more efficient than linearly walking the DOM. For more information on how Solid works and is so performant, check the links at the bottom of the article.

## Lesson Learned

Six months ago on my birthday, I wrote: [How I wrote the Fastest JavaScript UI Framework](https://medium.com/@ryansolid/how-i-wrote-the-fastest-javascript-ui-framework-37525b42d6c9). On that day Solid for the first time was the fastest in the world according to the [JS Frameworks Benchmark](https://github.com/krausest/js-framework-benchmark). I imparted my wisdom on where the frontend was heading and what you should look for in a framework. This time around, [Solid](https://github.com/ryansolid/solid) has surpassed even that benchmark, but we are looking at a very different landscape.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeThe amount of fine-grained reactive libraries holding the top spots in the benchmarks has boomed. Web Assembly hasn’t taken off. Despite superior execution speed, the overhead of interacting with the DOM means that at least for the near foreseeable future optimized JavaScript libraries will outperform WASM. Virtual DOM hasn’t moved much (although Inferno looks like it has reclaimed its crown).

I created [DOM Expressions](https://github.com/ryansolid/dom-expressions) hoping to enable people to take a common runtime and bring their reactive libraries and opinions to create their perfect UI developer experience. That was a naive dream. Instead of people using my libraries they just grabbed the code wrapping it into their libraries and have started taking things their way. Six months ago I would have never imagined that someone would take my code, in the name of shaving a few kilobytes, create a library that offers only a subset of the same features, and have almost 300 stars on Github. That’s amazing. That’s what open source is about.

Solid owes its pedigree to [Surplus](https://github.com/adamhaile/surplus) which proved JSX was a viable solution for reactive libraries (Sorry Rich Harris, but on this, you are emphatically mistaken). And of course, localvoid(Boris Kaul), who at this point, list reconciliation routine is something that pretty much every top library uses.

Neither would have I guessed that a small community of users would through feature requests, drive a refactor that would take web performance to new heights. That whenever I had a new idea there would be people eager to discuss, or whenever I was feeling exhausted there would be kind words waiting. People are there who take time to edit my articles or correct my naive TypeScript definitions. I owe many people my gratitude, as none of this would be possible without them.

Six months ago I felt that I was mostly alone. Now, this has grown beyond just me.

## Join the Revolution

It may have not happened the way I have pictured but we are definitely witnessing a shift. In the chart above 6 implementations are based on significant chunks of my [DOM Expressions](https://github.com/ryansolid/dom-expressions) code. That’s 50% of the top 10 (non-vanilla) implementations. It is a slow go driven by a few individuals and small communities. You won’t find a Facebook, or Google lurking in the background. Resources are limited and we’ve only just scratched the surface of what is possible here. We are constantly pushing the limits of performance and discovering new better ways to declaratively define user interfaces. There are many topics in the coming months:

- Server-Side Rendering
- Improved Suspense (better scheduling/continuations)
- “Real World” demo app
- Official Website
- Animations/Transitions

Come by and become part of the future of the web.

## ryansolid/solid

### A declarative, efficient, and flexible JavaScript library for building user interfaces. — ryansolid/solid

github.com

## Solid — The Best JavaScript UI Library You’ve Never Heard Of

### The last thing anyone is looking for is another JavaScript UI Library/Framework. But here we are anyway.

levelup.gitconnected.com

## The Fastest Way to Render the DOM

### Is the Virtual DOM, Tagged Template Literals, or Fine Grained Observables the fastest?

medium.com

## JS Framework Benchmark Current Results

### Current Interactive Results for the JS Framework Benchmark

krausest.github.io