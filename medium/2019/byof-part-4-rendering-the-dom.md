---
title: B.Y.O.F. — Part 4: Rendering the DOM
lastmod: 2019-01-23
source: https://ryansolid.medium.com/b-y-o-f-part-4-rendering-the-dom-753657689647
---

Top highlight

# B.Y.O.F. — Part 4: Rendering the DOM

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/?source=post_page---byline--753657689647---------------------------------------)[Ryan Carniato](/?source=post_page---byline--753657689647---------------------------------------)Follow16 min read·Jan 24, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2F753657689647&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fb-y-o-f-part-4-rendering-the-dom-753657689647&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--753657689647---------------------clap_footer------------------)162

1

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F753657689647&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fb-y-o-f-part-4-rendering-the-dom-753657689647&source=---header_actions--753657689647---------------------bookmark_footer------------------)Listen

Share

This article continues the Bring Your Own Framework Series exploring choosing your renderer. You can find the previous articles here: [Part 1](https://medium.com/@ryansolid/b-y-o-f-part-1-writing-a-js-framework-in-2018-b02a41026929), [Part 2](https://medium.com/@ryansolid/b-y-o-f-part-2-web-components-as-containers-85e04a7d96e9), [Part 3](https://medium.com/@ryansolid/b-y-o-f-part-3-change-management-in-javascript-frameworks-6af6e436f63c).

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*DgEQHQ2yavA5ex3FmlxrUQ.jpeg)
I’ve alluded to rendering being the key part previously but I left it for last since it is too easy to get focused on DOM rendering and performance and miss out on the real practical reasons for breaking apart the front end the way I have. The basis for my position is born out of building and maintaining medium to large Single Page Applications. Not from some theoretical soapbox and purely Benchmark armchair racing. But ultimately you are going to want to see some numbers.

Everyday there is a new Framework born especially with the advent of Web Components. They are largely similar, and all it takes is a opinion or 2 to branch another. I’ve made every effort to not throw out the Baby with the Bathwater so to speak, but just as importantly if I cannot back up what I say with real numbers I’m just throwing into the mess of things. It was not enough to be fast. I had to push to be arguably the fastest without compromising the boundaries I’ve set for myself. But truthfully it was not that difficult as there was a clear gap in this space (Modern Fine Grained KVO) and I just had to apply everything I have learned over the years. Well let’s get down to to it…

## Rendering Techniques

First we need a bit of background to establish a bit of a baseline. At this point the actual DOM methods and attributes used for manipulation are not that different across the board. The fundamental difference is how changes detected and propagated. I covered this in the last article in general. But for the purposes of how this applies to rendering there are basically 3 types. I am skipping the naive approach of innerHTML but I should mention that was generally the approach up 2009, and the performance for it was nowhere where it is today.

### 1. Fine Grained (KVO)

As far as I know this is the oldest one on the list. The idea was to “data bind” certain dom changes to specific DOM element changes. Classically this involved using special DOM attributes on HTML and walking over it build up this dependency graph. From there different implementations differed. Libraries like Angular kept a top down approach with its watchers executed through a digest cycle. Knockout handled this through explicit events that on each execution reset all subscriptions and rebuild them.

Pros:

- Amazing Partial Update/Animation Performance
- Arbitrary boundaries on data updates. (As granular as fits the application of change detection)

Cons:

- Overhead on initial rendering and teardown
- Performance greatly impacted by batching/synchronization of Change Detection mechanism.
- Steeper initial learning curve.
- Simplistic reconciliation makes unsuitable for large data snapshots

### 2. Virtual DOM

Popularized by React this approach involves reconstructing a tree that represents a DOM structure without touching the actual DOM each execution. This 'virtual' DOM can then be diffed and only the changes are applied to the actual DOM. There are different techniques of how to do this diff and patch but these libraries are always top down(an update loop involves re-evaluating descendants) and involve rerunning the “render” methods.

Pros:

- Simple to explain as all complexity is abstracted by rendering.
- Worst cases are never that bad as updates are always diffed and only then changes applied.

Cons:

- While cheap the act of always rendering everything as a Virtual DOM is not free and incurs a higher baseline cost for updates than other techniques.
- Attempts to mask Imperative nature with Declarative syntax are leaky abstraction at best since render function always re-executes.
- Boundaries are tied to Component lifecycles for performance/change management considerations. The renderer itself is often not isolatable.

### 3. Compiled DOM

This is a newer technique that borrows a bit from both other techniques. The code that describes the view is compiled into 2 methods, the first that runs initially and the second that executes on update. This approach also runs top down but the “render” method only runs once as after that point the compiled update method runs.

Pros:

- Hands down the quickest method for reconciliation.

Cons:

- Needs to be compiled ahead or at runtime.
- Independent of Change management so needs to be paired with one to scale to larger applications. Components are the natural fit but sets constraints on change detection boundaries.

Truthfully I was not aware of Compiled DOM approach before I started working on my own library but from a benchmark standpoint has the potential to generally unparalleled except for Partial Updates where Fine Grained still has the advantage. But otherwise it’s basically shares all the characteristics of Virtual DOM with less overhead.

## Designing a Renderer

As a fan of Fine Grained coding patterns and composability, the challenge was to modernize this approach which had long been thought of as slow. I knew that these libraries were all basically the same so I set out to make a solution that would work for any of them.

Fine Grained libraries classically used String Templates and nested contexts so that is where I started, basically modelling it after [KnockoutJS](https://knockoutjs.com). A computation in Fine Grained libraries is a method that reruns any time one of its dependencies updates. I’d insert string templates walk the DOM tree to pull out binding expressions and then link them to those DOM nodes constructing computations and then on removal of nodes I’d trace all their descendants to dispose of those computations. The data being bound started from the root Component object but as you hit loops in the template you clone the current context and mix in the iterated item and index variables. While I produced something quicker than Knockout this method was incredibly slow.

The next thing I tried was parsing the string template directly without inserting it in the DOM. This generated a large string of Javascript instructions turned into code via the Function constructor. It called runtime methods that created the elements manually with document.createElement and hooked up all the bindings. This approach still had context objects that would be cloned at each level. Each context would own an array of disposables that children would add to (independent of the DOM elements), to ensure that where released the child computations would be as well. I was pretty happy with this version. It was much faster and was edging out React 15 (the current version at the time). But admittedly I still had no real idea what I was doing at the time.

Then I stumbled on Adam Haile’s [Surplus](https://github.com/adamhaile/surplus) using JSX some time later. The idea was pretty straight forward. Use precompilation to wrap all the JSX expressions in functions to feed into Fine Grained computations. One thing was clear immediately was Surplus was optimized specifically for [S.js](https://github.com/adamhaile/S) it’s Fine Grained library and was incompatible with some of the Proxy techniques I was using in this space. Still I didn’t think too much of it since I figured I was doing pretty much the same thing without JSX. I tried various things, but over time I could never close the gap. One day I finally decided to do an experiment where instead of cloning contexts I wrapped over state with closures and I was in disbelief how much faster it was.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeSo JSX or a Hyperscript like variant suddenly looked appealing. However from a precompilation standpoint JSX is a lot easier to hook into. So I wrote a Babel plugin to do the trick. It allowed configuring your own Runtime so that it could be used with any Fine Grained library. [Babel Plugin JSX DOM Expressions](https://github.com/ryansolid/babel-plugin-jsx-dom-expressions) now has plugins that expand it to [Knockout](https://knockoutjs.com)([https://github.com/ryansolid/ko-jsx](https://github.com/ryansolid/ko-jsx)), [MobX](https://mobx.js.org/)([https://github.com/ryansolid/mobx-jsx](https://github.com/ryansolid/mobx-jsx)), and [Solid](https://github.com/ryansolid/solid). The key difference between this work and earlier work is closures removing the need for nested contexts greatly simplified things, and instead of creating elements one by one the JSX templates are actually compiled back into String Templates sans the dynamic expressions and set into a Template Node so that that they can be cloned on demand. As it turns out cloning nodes is a lot faster than than document.createElement and appending. In addition being careful to only access certain properties on a DOM element actually reduces the cost significantly. For example node.childNodes is exceptionally slow as it is not a real array and upon accessing it you making the browser do a bunch of extra work.

## Benchmarking

All in all the result was impressive. But I needed to see where the solution actually sat. I have to say I was not prepared for the world of JS Benchmarking. I had been developing mostly using my handy circles benchmark to optimize and stumbled on to a few tricks but the one thing I learned is things are not always as they seem. Boris Kaul, author of JS Framework ivi, has written a wonderful article “[How to win in Web Framework Benchmarks](https://medium.com/@localvoid/how-to-win-in-web-framework-benchmarks-8bc31af76ce7)” which really highlights the optimizations that sort of cheat these benchmarks to get better results. These being well known has caused the Benchmarks to change or atleast has evened the playing ground. Since then there has also been advances in “incremental rendering” which uses the “Principles of Animation” to offer an enhanced viewing experience. Which is just code for improving performance by intentionally dropping frames. It makes many historical Benchmarks less useful today. So instead of focusing on all the cheats, I’m going to try to derive meaning from the results to validate the approach taken.

Solid the “framework” that I’ve put together from all the pieces (Container, Change Management, Renderer) is generally the most performant of the libraries using the Babel Plugin thanks to it’s S.js core and the one that I will be comparing here. It has some overhead for ergonomics. Where it takes a hit is its state object is an ES6 Proxy, and it’s state setter offer powerful syntax that has a bit more overhead than if you hand wrote your updates. Even though Fine Grained my intention is to make the code easily understood for an audience familiar with React where it makes sense.

Finally everything I’m running is in the latest Chrome. So results may very in other browsers especially those with poor ES Proxy support.

### 4. Circles Benchmark

This was the first benchmark I ever came across comparing Web Frameworks. Jeremy Ashkenas, the author of [Backbone](http://backbonejs.org/), made [this](http://jsfiddle.net/jashkenas/CGSd5/) JSFiddle back in 2012 to illustrate the difference in performance between Backbone and [Ember](https://www.emberjs.com/). It did so by animating 100 circles on a setTimeout 0 loop. This test was incredibly crude measuring main loop time and over time several forks appeared comparing different frameworks and optimized VanillaJS. I’ve rebuilt this benchmark with 300 circles and measuring full time between loop iterations. You can check it out here: [Circles Benchmark](https://github.com/ryansolid/circles-benchmark). In general this is not as useful of a benchmark as it once was as modern computers are much more performant and scaling up the nodes even further departs from any practical usefulness of the scenario.

The data for this benchmark is simple and doesn’t require much in the way of reconciliation. While the list has fixed elements, every element is updating all its properties every cycle in an incremental way. There is no optimization to be made just pure execution time in a fairly forced manner. While it tests partial updates an area classically favoring Fine Grained, since every property updates no work is being saved, every node is touched. Where many Benchmark really focus on extreme challenging cases, I consider this one useful for understanding a Libraries floor or baseline performance. While his benchmark is completely unrealistic in a real application its the most common case for interaction blasted to the extreme. It’s the worst best case.

How did my library fair. Admittedly this benchmark is a work in progress and more libraries need to be added. But overall, Pretty decent. For this one being so baseline there are 2 versions of a Solid implementation. One that looks more like React with State and one slightly more performant that uses Signals like Knockout. Given the goal of a baseline it is more fair to show the more simple primitives for Apples to Apples comparison. Only other observations really are Inferno is really quite fast here, and React 16 improved performance edges out Preact. [Try it yourself in your browser](https://ryansolid.github.io/circles-benchmark/) and I recommend refreshing between libraries.

### 3. DBMon

This benchmark has some history. It was first shown at React conf in 2015 by Ryan Florence. I feel it was really the Benchmark that backed up React’s initial claims that the Virtual DOM was the most performant approach. Ryan’s implementations of Angular and Ember were fair given the framework provided tools but this scenario was definitely tailored to showcase React. Mathieu Ancelin has put together [a site that has most major frameworks](https://github.com/mathieuancelin/js-repaint-perfs) (although a few years out of date for most) [where you can try them](http://mathieuancelin.github.io/js-repaint-perfs/). It is very clear that some libraries have been very much gaming this one while other implementations especially some of the early fine grained ones are so naive (like Knockout’s) essentially redrawing the whole screen every update.

DBMon simulates Database monitoring stats by basically rapidly spamming a snapshot of a 2 dimensional array of fake database monitoring information. Unlike the Circles Benchmark which consists of known targeted updates this is a full data dump of completely random new data as if given by the server. You can control the rate of mutations which is helpful to see how libraries perform under different scenarios. As I said Fine Grained libraries were completely out of their scope when this was introduced. See a Virtual DOM library like React can always at worst just re-render it’s whole Virtual DOM and only apply the changes. For Fine Grained you have to basically map all the data points to observable data fixtures and manually parse and apply updates before you even render. For early Fine Grained libraries that didn’t batch or had awkward execution loops it was probably easier to just give up and redraw the whole thing. There is an optimized mode as well that originally was added to allow Angular to compete but other frameworks have leveraged it. Instead of giving new blobs of data it mutates in place. For the libraries that work that way this is a huge boost, but given Solid’s approach of comparing previous state against new changes it was impossible to leverage.

I will say for how “realistic” this scenario in my experience it is not a terribly common case for client application. I highly recommend moving that mutation slider around and notice the difference of how libraries perform. Some libraries are relatively flat while others are very extreme. Fine grained libraries are optimized for lower mutation levels like you find in most applications. The amount of server transfer and lack of simulated interactivity makes this just a good way to try disqualify fine grained performance. If this scenario was at all real what would the actual mutation rate be like 5%, 10%. I wasn’t having any of that.

So how did I do with Solid? You can [see and run my implementation here](https://github.com/ryansolid/solid-dbmon). As always mileage will very but I’m very happy with the results. The performance is right up there with Inferno and the fastest Virtual DOM libraries. Yes there are some absurdly fast implementations like Aurelia and Ripple that are using some very specific techniques here, but in general the performance of the reconciler in Solid is more than adequate for what I consider a worst case scenario.

### 2. UIBench

Now we are getting to a meatier Benchmark. Unlike the 2 previous benchmarks this one is still relevant and is one of the most useful tools for someone building a library. [UIBench](https://localvoid.github.io/uibench/) was created by Boris Kaul, the author of the [ivi](https://github.com/localvoid/ivi) framework. This benchmark runs a fairly exhaustive set of tests across 3 scenarios, a table, a tree, and animating a list. It also categorizes the implementations and has many different modes of running. For those seeking running your library through a battery of Rendering tests this is the one.

One of the key configurations is whether to measure for the full time or just the time spent in JS. It defaults to JS but I recommend immediately checking that box to use full render time as not doing so doesn’t account for techniques used for DOM manipulation. Next there is the shouldComponentUpdate (sCU) optimization. Click disabling it off. The default is just DBMon again, but if you are in a more realistic setting like using Redux or Apollo this is how you are going to be setup. Immutable, reference comparable data. Why this is not the default escapes me. I can only assume that the other options highlight certain libraries better. If you want an apples to apples test I suggest skipping any library that doesn’t preserve state or recycles DOM nodes. Both of these approaches would corrupt real life scenarios, and while a novel point of interest to showcase performance optimization have no real general value.

So how did Solid do? Well UIBench is very cleverly designed where the implementations don’t actually live in the repo and instead get driven off a URL. Just paste this in and it will launch the benchmark in a new window(all scores are tallied at the bottom of the initial page):

[https://ryansolid.github.io/solid-uibench](https://ryansolid.github.io/solid-uibench)

Results. On average pretty good. Under the configuration above totals are comparable to Inferno and ivi well out front of other Virtual DOM implementations. Boris recommends you do not treat the totals as the score, which I can get behind in the sense that the amount of tests are disproportional to the importance of those tests. For instance there are only 4 Animation tests. But on the other hand a score is a score and every point you give up one place that gets made up elsewhere is fair game. Solid definitely displays weakness for Trees especially on inserts and sorting on the edges of the list, but is really pretty good for most Table operations. Table Activate and the Anim Benchmark Solid is the fastest of the bunch which makes sense as those rely on partial updates. But to put it in perspective even where Solid is weak more popular libraries like React are much weaker in this benchmark.

It’s worth calling out Stage0 here for a minute. As I’ve been talking a lot about Fine Grained and Virtual DOM and this library is of the 3rd type. It cannot implement sCU optimizations because of how DOM reconciliation works but that does not hurt its results in this benchmark. Stage0 is more of a utility belt (think jQuery) than a View library, so in some aspects its not a fair comparison. But it shares same underlying approach with DomC which is, and is blazing fast.

### 1. JS Frameworks Benchmark

[JS Frameworks Benchmark](https://github.com/krausest/js-framework-benchmark) really is #1. It’s the only one I’m presenting here that you can not easily run in your own browser to see the results for yourself. But the tradeoff is a benchmark that very accurately measures much more realistic scenarios than other benchmarks. It does not rely on repeated spamming of large datasets and doesn’t fully subscribe to the recent flood of benchmarks around Time to Initial Paint, Meaningful Paint, and Interactivity etc.. They only tell the story of the first (very vital) seconds of the page load. This benchmark goes way beyond just that looking at common operations that would be done on a table(or really any sort of loaded grid/list), including transfer bandwidth and memory consumption over these operations. It really has a little bit of everything from full renders, node replacement, sorting, selection, partial updates, single removal, full removal, appending. In addition it makes good use of CPU throttling to simulate lower power devices to really highlight performance bottlenecks. All in all this is an invaluable tool for realworld performance testing.

[The latest results](https://krausest.github.io/js-framework-benchmark/current.html) are always changing and I could write a whole article just examining the top 10 entries on this list. Most article writers focus on the popular libraries understandably, but from my perspective from a performance standpoint they are uninteresting. They are just performant enough and all very comparable. Instead I’m just going to point out a few things.

First of all this page has 2 sets of 3 tables. You can just ignore the latter 3 tables. These are for something called non-keyed results where DOM nodes are recycled. It is an interesting performance optimization in some scenarios, but the side effects in general are more detrimental than even [this article](https://www.stefankrause.net/wp/?p=342) (which is a great introduction to the idea) makes out. Every real library should have a Keyed implementation as well so we can safely disregard that.

Second, although this may change by the time you read this, Solid is sitting pretty just behind (or tied depending how you look at) DomC as the most performant framework. Technically 2 vanilla JS implementations and Stage0 lead the pack but they are essentially reference builds of the idealized hand-crafted solution and do not prescribe the same model as the other libraries in the benchmark. There are a few other reference builds in the top 10 including the Web Component and Web Asm ones. Skipping these if you today were to list the top performing frameworks within 20% of the most optimized vanilla JS it would look like:

- DomC (Compiled DOM)
- Solid (Fine Grained)
- Surplus (Fine Grained)
- ivi (Virtual DOM)
- Knockout JSX (Fine Grained)
- MobX JSX (Fine Grained)
- PetitDOM (Virtual DOM)
- Inferno (Virtual DOM)

There is a good mix of different technology here and all of these are really close. But each approach has strengths and weaknesses. Virtual DOM has generally higher memory usage (although some Fine Grained libraries are pretty bloated but that is not a fault of the renderer) whereas Compiled DOM has the least. Fine Grained has better Partial Update and Select Row performance.

Third, there has been some discussion about the benchmark being unfairly setup for Fine Grained as it has less bindings than a real application per DOM node. But I’d challenge that. In my experience the number of dynamic bindings is relatively low per DOM node and it’s event handlers and static properties that make up the majority of bindings. This actually informed the design of bindings in the Babel plugin. Other than perhaps a hover(mouse over) effect this table is pretty realistic and that would be likely handled in CSS. Add another table cell might mean another binding but it also means for DOM nodes.

Finally, by default the list is sorted by Geometric slowdown which can be seen as an overall performance score. But click on Partial Update and see how different the list looks. Angular suddenly jumped way up the list. Knockout which is at the opposite end of the list can be seen without scrolling the page horizontally. Conversely Vue is way back. I’d argue this benchmark’s impact is underrepresented if anything as while rendering the page is common interacting with it is all about partial updates. While that alone isnt the end of the story it is secretly why Angular is a bit faster than generally appears and Vue is the opposite.You got to love React’s consistency if nothing else.

## Conclusion

If you made it this far kudos. This article has a lot of links and things to play with but it is not that visual and the subject matter a bit dry with a lot of detail. But maybe you learned something or have better insight into considerations around designing, building, and validating a JS renderer. More importantly though, is recognizing all the great options in Renderers out that and understanding how they can piece together into “your” framework without being stuck with the big 3.

Next time I will be wrapping up this series reviewing and reflecting on what I’ve learned, and go into what it took to pull all the pieces together.