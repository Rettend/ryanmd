---
title: What Every JavaScript Framework Could Learn from React
lastmod: 2019-03-26
source: https://ryansolid.medium.com/what-every-javascript-framework-could-learn-from-react-1e2bbd9feb09
---

# What Every JavaScript Framework Could Learn from React

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/?source=post_page---byline--1e2bbd9feb09---------------------------------------)[Ryan Carniato](/?source=post_page---byline--1e2bbd9feb09---------------------------------------)Follow7 min read·Mar 27, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2F1e2bbd9feb09&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fwhat-every-javascript-framework-could-learn-from-react-1e2bbd9feb09&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--1e2bbd9feb09---------------------clap_footer------------------)294

1

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F1e2bbd9feb09&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fwhat-every-javascript-framework-could-learn-from-react-1e2bbd9feb09&source=---header_actions--1e2bbd9feb09---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*RqxoI85-ePs65wzN6S2jpg.jpeg)*From pexels.com*

Even years later, I question whether it’s understood why React was so revolutionary for UI frontends. It’s easy to get pulled in by all the features and the technical execution and miss the simple pieces that make React so effective. It is not about the Virtual DOM, JSX, or Server Side Rendering. It’s about a simple design philosophy that extends outward to how to approach any UI problem.

## Controlling the Conversation

When looking at the approach React has taken the main things that should stand out are its unidirectional data flow, controlled mutations, and composition. It is no coincidence that those three naturally fit together.

2-way binding, while incredibly convenient, is terrible. 3 years ago I never thought I’d be saying this. Even after using React for 3 years I still felt the same. After having spent the first decade of my career with 2-way binding, I could never appreciate the why of making things so unnecessarily bloated. But it is not so much that unidirectional nature is the justification. After all, whether it’s automatic or explicit the data still flows in both directions. State still sets the value of that input and on the change event, the value of the input updates the state. Once declaratively wired up it occurs automatically and continuously whether 2-way or not. And truthfully libraries that advertise 2-way binding as a feature rather than a detriment still use 1-way binding 90% of the time anyway. So that’s not the root of it.

Most of the time, differences in syntax are superficial. I mean is state.name = 'John' that different than setState({name: 'John'}) ? As it turns out in this case yes. The most important thing here is that state and setState are independently managed. Read and write are completely separate. They can be passed around separately with a clear purpose. Passing state down is insufficient to update it. The owning component can not only choose what child has access to portions of its state but to which degree a child can update it. As a result, 2-way binding would never be a clean solution, and the control this affords is significant. This is a similar idea to global state management like Redux. This is a very sane way to control large distributed data. While it works well with immutable data, it isn’t a rule. As long as you explicitly control the update method separate from the read the goal is achieved.

This approach lends very well to composition as you have more fine-grained wrappers than what you’d usually find with classic OOP. React Hooks put this on display. But React was far from the first library to attempt declarative data patterns like those found in Hooks. They are just the most natural evolution of this concept.

## Clear Vision

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*MQvEK1A8sis16xzq0zcWig.jpeg)*Person Eye by Victor Freitas*

That’s the thing about React. For all its change over the years, it has had a very clear trajectory. It’s not about feature chasing as much as ensuring that at its core it was best at putting forth its design philosophy. It’s hard not to admire such purism. To better understand let’s look at JavaScript UI development before React.

While JavaScript goes back to the mid-90s, a bunch of factors led to it becoming a legitimate option for building out UI’s in the mid-2000s. This was the Wild West and libraries like prototype.js and jQuery appeared giving a much-needed wrapper over the DOM API’s of the time. Over the next few years, the need for greater structure became a necessity and was addressed by libraries like BackboneJS and AngularJS. While this brought structure to code it still propagated the same open mutation procedural mindset running through checking which values had changed and updating appropriately.

There were concerns with performance with these approaches so it was not long before libraries like KnockoutJS and EmberJS gained momentum. These used fine-grained change detection mechanisms to allow tracking of changes to do minimal updates on change. So unlike Backbone, which would replace the innerHTML, or AngularJS which would run through its watcher's dirty checking changed values, these libraries would use data-binding to update only the parts of the DOM that depended on these variables. In practice, the performance gain wasn’t as considerable as you’d expect. It was enough to encourage ES committee to propose introducing it as a primitive with Object.observe.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeA couple of years pass in this state, with more and more fine-grained libraries appearing, and that is when React makes its appearance. It was a chaotic time. Declarative 2-way data-binding while capable of incredible things, had run amuck. The web of dependencies that appeared in large apps without clear structures or patterns was hard to reason about. And more involved frameworks like AngularJS and EmberJS were beginning to recognize that MVC, innately stateless, was the wrong pattern for the client. Instead of trimming the fundamentals, they were adding more things to MVC*&@!. React came in to press the reset button.

## Understanding the Trend

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*UNPFmY360ZGpHga1h7yGkA.png)*JavaScript Frameworks in 2013*

The way I view this progression is a 2D graph on 2 axes that split into 4 quadrants. Horizontal from Coarse to Fine Grain updates, and Vertical from Loose to Explicit data update control. The web started in Quadrant 1 (Coarse Grain/Loose) and was on a mass exodus to Quadrant 2 (Fine Grain/Loose) when React came in to point out the utter chaos. React appeared in Quadrant 3 (Coarse Grain/Explicit) with a new way to solve performance issues(the Virtual DOM) without going into the chaotic Quadrant 2. The return to simplicity caught on like wildfire and almost all libraries in Quadrant 2 crossed back into Quadrant 1 to employ these new techniques, but almost none of them moved to Quadrant 3.

Why not? Well, they didn’t need to, to emulate React’s technology approach, and they viewed their data approach as part of their identity. Today almost all libraries that are not React-clones sit in Quadrant 1, including many that use the Virtual DOM. Angular is still there after all these years. Vue’s fine-grained data feeds into a Virtual DOM. Polymer is quickly moving to Lit-HTML which is similarly loose and top-down. But truthfully I wonder if they have just all missed the point. React’s true strength was never that it found a way to make the Western Hemisphere viable. Angular 2 did that as well. It was that it is sitting in the Southern Hemisphere. Anyone paying attention will notice that while everyone has been distracted heading West, React has been slowly heading East this whole time.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*GTGJjdOlRQqTLuSwUfUNLw.png)*JavaScript Frameworks in 2018*

Wait, isn’t that the land of Chaos? Not if you approach it on the Southside. They have been vying for the prize in Quadrant 4 and absolutely no one is in that space. In some almost too strange bait and switch while everyone has been tripping over their own feet to turn back West, React has been continuing the journey East. Look at the features: Time Slicing, Suspense, Hooks. And that’s what there is to love about React. They haven’t been wavering or doing some confusing dance. They’ve just been following a clear path from this perspective.

Others are starting to take note too. Vue is looking to expose their Observable primitives in 3.0. A reactive library that was content hiding it behind configuration objects. How many other libraries are just going to end up looking dizzy with all these 180 turnarounds?

## So Quadrant 4?

We will have to see. But I believe. See, I have a love-hate relationship with React. I adore its design philosophy and API, but I am not a fan of all its technology choices. That puts me in strange company. When React came out I was firmly in Quadrant 2 in my thinking. While I grew to appreciate React’s design decisions, I detested the overhead of the Virtual DOM and even more resented that libraries I liked or could like were regressing(in my mind) back to Quadrant 1.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*DSr7nxuXihuP79ffys3E0w.png)*JavaScript Frameworks Tomorrow*

So I wrote my Library in Quadrant 2 intending to head South instead of West. A library based on the foundations of asynchronous rendering and primitive fine-grained Hooks, that would learn the real lessons from React in terms of immutable data/uni-directional control flow. Attacking the same problems as modern React from the other side. And in addition, being in contention for the Fastest UI Frameworks period according to the [JS Frameworks Benchmark](https://github.com/krausest/js-framework-benchmark), it is pretty impressive.

## solidjs/solid

### A declarative, efficient, and flexible JavaScript library for building user interfaces. - solidjs/solid

github.com

React isn’t the only library vying for Quadrant 4. And while everyone else is trying to figuring out which way to look, I suggest you give Solid a chance and see for yourself what modern Frontend UI development can look like.