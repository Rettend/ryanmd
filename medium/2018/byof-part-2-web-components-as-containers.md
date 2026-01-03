---
title: B.Y.O.F. — Part 2: Web Components as Containers
lastmod: 2018-11-19
source: https://ryansolid.medium.com/b-y-o-f-part-2-web-components-as-containers-85e04a7d96e9
---

# B.Y.O.F. — Part 2: Web Components as Containers

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/?source=post_page---byline--85e04a7d96e9---------------------------------------)[Ryan Carniato](/?source=post_page---byline--85e04a7d96e9---------------------------------------)Follow8 min read·Nov 20, 2018[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2F85e04a7d96e9&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fb-y-o-f-part-2-web-components-as-containers-85e04a7d96e9&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--85e04a7d96e9---------------------clap_footer------------------)66

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F85e04a7d96e9&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fb-y-o-f-part-2-web-components-as-containers-85e04a7d96e9&source=---header_actions--85e04a7d96e9---------------------bookmark_footer------------------)Listen

Share

This post continues the Bring Your Own Framework journey I took to create a modern JS Framework. In Part 1, which can be found [here](https://medium.com/@ryansolid/b-y-o-f-part-1-writing-a-js-framework-in-2018-b02a41026929), I outlined a modern JS Framework’s core could be split into 3 parts. This article focuses on the first part: The Container.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*2kLrLgDZjAt0P_xNrM1qtg.jpeg)
Web Components have got to be one of the most misunderstood things in modern front-end JavaScript development. The expectations here are through the roof. Some people are heralding them like they are the replacement to all JS Frameworks. Others are trying to treat them as a Framework themselves. From the cry out of the [Broken Promises of Web Components](https://dmitriid.com/blog/2017/03/the-broken-promise-of-web-components/) to the people writing their own specs on how they can “fix” Web Components by adding a bunch of new features, the whole thing is absurd.

The peak of absurdity might have been when I came across [this](https://github.com/sokra/rawact/issues/3) Github issue claiming that Web Components were simpler to write than React Components on a repo whose purpose is to pre-compile React code for existing React code bases. What does that have to do with Web Components? What are Web Components supposed to be anyway?

Perhaps it might be easier to start with what they are not.

Web Components are not (necessarily) Components

Well, … not capital ‘C’ Components like you know from your other JavaScript Framework. I don’t mean to mince words. It’s just that you can’t talk about Components in front-end JavaScript and not make a tie back to React or one of the other popular web frameworks. Components serve a very special purpose there, and not just to act as a means to modularize your code. They define boundaries of state change management. They tend to have specific life cycles. They tend to have non-arbitrary boundaries. They tend to be a non-independent cog in a larger system.

Now Web Components can have those characteristics but it isn’t what they are. Web Components are just isolated DOM elements that house HTML, CSS, and JS. They aren’t opinionated, and they are general purpose. They are a template; an empty shell. They are there for you to use.

It’s a good thing the W3C hasn’t gone too far with them in terms of binding syntax in their templates. Maybe managing properties could be easier then wrapping everything in getter/setters, but with the expectations of what Web Components do today, they actually do a lot. They just solve a different problem.

Web Components are the Container. They encapsulate your code over a common and limited interface. Since they are just DOM elements every person and their framework can interact with them. The promise they provide is the ability to package up your code in a way that can consumed anywhere by anyone. That is a very compelling idea when you are living in a world of constantly changing best practices and frameworks/libraries appearing and fading like shooting stars. Still even in the community itself there are a few different approaches on how to best use Web Components.

## 1. Web Components to Modularize Framework X

[Angular](https://angular.io/) and [Vue](https://vuejs.org/) both use this approach with Web Components. They let their developers take an existing framework components and wrap them as Custom Elements. These wrappers generally convert the inputs and outputs of these components into standardized API and with the inclusion of their runtime, usually much larger than the next options I will discuss, you can use these components outside of applications built with these frameworks.

The benefit is you can use the framework you are familiar with and there is very little expectation on how you use the component. The overhead of a larger js bundle is a consideration so despite interoperability you probably aren’t going to mix and match much. Sure code splitting can help a bit on page loads but this is an option for packaging up existing widgets for external use not so much a way to build your applications.

## 2. Web Components as the Framework

[Polymer](https://www.polymer-project.org/) is the first to come to mind as it was really the first popular library to push the use of Web Components. But other competitors, like [Stencil](https://stenciljs.com/), have recently shown themselves to be players. These frameworks generally smaller than those in category 1, are trying to provide their own full solution built on this technology. Web Components are the Components. They try to tackle everything a traditional JS Framework would tackle. This is where the mindset of Web Components vs React Components comes from. They are directly comparable. These libraries started as being very specialized and locked in with convention as much as traditional JS Frameworks, but as time has gone on they have increased their compatibility.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeThe benefit here is these libraries truly are made with Web Components in mind. However, I think a new one of these is born every 20 minutes or something. Let’s face it. If you don’t like something some framework is doing you can just write your own framework. This area is ripe with fracturing as this approach has many of the drawbacks of larger traditional JS Frameworks since the solution will be opinionated. The danger is that anyone can just write their own.

## 3. Web Components as a Container (Bring your own Renderer)

This is a relatively newer idea and is most closely popularized by [SkateJS](https://skatejs.netlify.com/). Skate wasn’t always like this. Skate started as a Web Components as a Framework library much like those in the 2nd category. It used a couple different renders over it’s early versions (Preact, and Incremental DOM) I believe. At a certain point they decided to change it to be bring your own renderer. So you can use Skate with React, or Preact, or LitHTML, or whatever you feel like. This was a pretty revolutionary idea really since there is no Framework buy in. Skate sets the interface and you can use whatever you see fit.

One of the big benefits here besides not being locked in to a certain framework is this approach very much plays into the trend of micro-renderers where people have been writing increasingly smaller libraries to handle only the rendering concern. I honestly have no shortage of praise for the team that built Skate as they also have really contributed to the community with viable approach to SSR with Web Components and even supporting some polyfills for V1 ShadowDOM spec when the official polyfills were nowhere to be seen.

So would you be surprised to know I didn’t end up using any of the above libraries?

Now as I suggested in the opening this idea of container is what attracted me to Web Components. While I never set out to write a JS Framework, I had been working on my own Web Component library now for the better part of 4 years built on this principle. If Skate had been like this from the beginning I probably would have never bothered. But I’m sort of glad I did because even Skate doesn’t quite handle my desired case as cleanly as I’d like.

## 3b. Web Components as a Container (Bring your own Component)

See I have to blame [KnockoutJS](https://knockoutjs.com/) for this again. My first foray into Web Components was with Knockout at work back in 2013. We realized that our web of View Models was not going to hold up, so our COO decided that Web Components were the future and started prototyping out ways to use Knockout with Components. This became my project in 2014 and finding [document-register-element](https://github.com/WebReflection/document-register-element) as the baseline polyfill and I built a library that did most of the v0 spec for web components using Knockout’s custom bindings(directives) to simulate content insertion (predecessor to slots).

During the process of developing and converting our application, React had been released and it was clear times were changing. At that point I realized that Web Components was our escape hatch to get out of Knockout which had already started to slow down. In 2014 I independently created [component-register](https://github.com/ryansolid/component-register), named after that initial polyfill, which was a library that would support multiple frameworks as custom elements. We migrated to it and it has been used in production since early 2015.

There was one key thing though. React and Knockout were worlds apart. Knockout uses templates and declarative data, and React uses top down rendering and lifecycle functions. Change propagation even from the props had to be handled differently. React also had it’s own components so it felt a bit awkward defining different components, and I had already hit naming conflicts when playing around with Custom Elements. So instead I decided that I wanted the Web Component piece to be as unobtrusive as possible. That the component would be purely JS and that Web Component would be hidden.

Instead of Bring your own Renderer like Skate would become, [Component Register](https://github.com/ryansolid/component-register) is Bring your own Component. While it’s possible to implement something like Knockout in Skate all the provided mixins and patterns for the renderer and update cycle are incongruent with declarative data approaches. You could write it yourself, but taking a page from Knockouts Custom Bindings I aimed to abstract the DOM element even if it was the Web Component’s element itself.

It was React’s [HOC](https://reactjs.org/docs/higher-order-components.html)’s that brought the mixin pattern I was looking for and in 2016 I open sourced the project along with a couple example library mixins. Like for React you use actual React Components:

For a different library there could be a different HOC to fit the component’s native to that library. Under the hood the library passes the custom element through which has a few hooks that can be implemented by the mixin and hidden from the end user. You can develop in the intended style of the library you use without Web Components imposing any restrictions on you, and the pattern is completely composable.

This is actually kind of great. I found myself writing cross framework functionality as general purpose HOC’s that extended the element. And it played nice with any existing extensibility of the libraries themselves. The biggest thing is I’m not concerned in the slightest that if the code patterns/library change. I would be able to easily piece-wise update as I see fit. The container imposes no restrictions on the components used and act as the lightest wrapper over the Web Component spec. There is no need to change this base if opinions change.

So that is how I ended up creating a Poly-Framework Web Component Library. You can find it on Github at:

- [Component Register](https://github.com/ryansolid/component-register)
- [Component Register Extensions](https://github.com/ryansolid/component-register-extensions)

This is still just a small library, so take a look and star it if you like what it’s doing. Next time I will dig into [Change Management](https://medium.com/@ryansolid/b-y-o-f-part-3-change-management-in-javascript-frameworks-6af6e436f63c), and what goes into solutions in this space.