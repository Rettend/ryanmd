---
title: B.Y.O.F. — Part 3: Change Management in JavaScript Frameworks
lastmod: 2019-01-02
source: https://ryansolid.medium.com/b-y-o-f-part-3-change-management-in-javascript-frameworks-6af6e436f63c
---

# B.Y.O.F. — Part 3: Change Management in JavaScript Frameworks

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/?source=post_page---byline--6af6e436f63c---------------------------------------)[Ryan Carniato](/?source=post_page---byline--6af6e436f63c---------------------------------------)Follow11 min read·Jan 3, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2F6af6e436f63c&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fb-y-o-f-part-3-change-management-in-javascript-frameworks-6af6e436f63c&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--6af6e436f63c---------------------clap_footer------------------)155

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F6af6e436f63c&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fb-y-o-f-part-3-change-management-in-javascript-frameworks-6af6e436f63c&source=---header_actions--6af6e436f63c---------------------bookmark_footer------------------)Listen

Share

This post continues the Bring Your Own Framework journey I took to create a modern JS Framework. In [Part 1](https://medium.com/@ryansolid/b-y-o-f-part-1-writing-a-js-framework-in-2018-b02a41026929), I outlined a modern JS Framework’s core could be split into 3 parts. [Part 2](https://medium.com/@ryansolid/b-y-o-f-part-2-web-components-as-containers-85e04a7d96e9) focused on the first piece, The Container. This article focuses on the second, Change Management.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*HdQJFPeW_RUNxHv5uTBWAg.jpeg)
## Model View Something…

All modern client JavaScript frameworks are based on some type of MV* (Model View Controller/Presentation/ViewModel) pattern. Data driven flows are much easier to follow and reason about as they allow us to separate manipulation of our data from corresponding presentation of it. Presentation code at that point becomes a trivial mapping:

var view = fn(data);Most importantly, these frameworks allow the developer not to be concerned with how to most effectively to render and keep this view up to date. You update the data and the view updates to reflect that.

This pattern has existed for a long time across lots of UI driven technologies. However, its initial popularized forms, like MVC, were never designed to handle applications as complicated as current client-side Single Page Applications. It is not that the pattern of data and presentation separation doesn’t hold up in larger applications. It’s that the way we separate can not be purely horizontal. It is insufficient to just split out more Controllers. This has lead to many different architectures but at this point the one thing that became clear is that like the Pages and Applications that is presented this pattern needs to be applied compositionally, if not fractally. While it may seem obvious after the fact, many of the first versions of popular frameworks (like Angular, and Ember) did not have a very good managed way of handling nested(localized) state and required almost a full rewrite to cleanly release their second versions.

The reason for this is the transformation and synchronization between data and its presentation is the core of these libraries. It is arguably the most important piece of what informs the developer experience of the framework. While the ergonomics of using a library can be wrapped, the underlying performance characteristics are defined by the approach taken to change management. It impacts the options of how the View is rendered and even in many cases how code should be modularized.

As one can imagine if handled improperly state management is a mess. As soon as you impose boundaries for organization, the process of synchronization becomes even more complicated between locations. There are good patterns for this including unidirectional data flows and Flux which separate global and localized state. I could write a whole article about them alone, but luckily ever major framework has solutions for this and many like Redux could applied to any framework. Further, some of these standalone libraries can act as swap-ins for local state in frameworks, like MobX in React, so needless to say there are lots of options.

Especially recognizing all frameworks have state/change management built in to at minimum handle rendering we need to figure out how to best evaluate these options. It can’t be done completely in isolation of rendering which will be covered in the next article, but there is commonality in all approaches that can be characterized and categorized.

## Granularity

The most defining characteristic of the change management solutions are their granularity. Change by definition is mutation. Regardless of how immutable your data is at some point a reference is being changed. It can be at the root of your application or at the furthest leaf of your state tree, but somewhere an existing reference is being changed to a new value. Change detection is also immutable. At some point you will be comparing values to know if they have in fact changed. Whether that is limited to basic value types like Integers or Strings or extends through whole trees of Object references you will be doing some comparison.

So when I refer to granularity I am talking about the point at which the mutable meets the immutable. In some libraries this itself is the construct that you control(Observable). In others its a byproduct of how you structure your code(Components). In others it is always at the root(Root). In others still it isn’t even recognized as a thing and always happens at the leaves(Leaf). But in all cases it is present.

## Propagation and Reconciliation

All change results in updated DOM and/or further changes. Reconciliation in rendering is the process of updating the DOM created from the previous state to reflect the new state. I’m calling the process of comparison and reconciliation Change Propagation. This is the central execution flow of the library. Because the granularity of the change detection sets where comparison happens it is typically where the cached value lives. But it is not always where the comparison routine begins.

There are two common approaches to Change Propagation:

### Top-Down

This is where from the root or some point in the tree everything below is executed. If immutable from that point there is a diffing algorithm applied with opportunity to use memoization to optimize unnecessary downstream execution. If mutable no execution optimization techniques can be applied but when traversing the tree comparisons do not need apply until the leaves.

### Events

Subscriptions are made to specific points in the tree that when set if the new value does not match listeners are notified to update. This pinpoint approach is efficient for updates as no tree walking is required and allows for greater control over change propagation, but has more overhead for build up and tear down.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeBoth approaches have their pros and cons and different effect on rendering. It is interesting when libraries that have depended on one mechanism primarily have borrowed from the other to improve their weaknesses. Events can be less specific to cover more of the tree, and mechanisms like Hooks in React can provide more of the control classically afforded only to events.

## Scheduling

The final part of change management is the scheduling of the change propagation. This is not as simple as it looks on the surface. DOM updates are expensive operations, so ensuring unnecessary work is not done is critical to performance. To make things more complicated data consistency can become a concern. Having different parts of the application seeing different data can be detrimental to the user experience and your sanity.

### Manual

The basic approach — one still used by many rendering micro-libraries — is triggering updates via a manually called update or patch method. While requiring knowledge of the scheduling process, something that pokes holes in the declarative abstraction, it gives ultimate control on when to re-render. Generally it will immediately propagate the change, but I’ve seen libraries even offer options when to schedule the update (next task, microtask, animation frame). Generally mature frameworks don’t use this approach as the go to where they can avoid it, but many offer it as a fallback like React’s forceUpdate.

### Immediate

Where once the most prevalent it is not as common anymore on its own. This method triggers propagation whenever the data is updated. It is not batched so it is easy to cause unnecessary work when the API doesn’t allow for multiple changes in a single operation or when the granularity is wide. However it is the simplistic ideal. Hence stores like Redux use this approach. You dispatch a data change and it is immediately updated and propagated.

### Deferred

The easiest way to batch changes is just to defer them to the next microtask whenever new data is set. It as after the current executing task completes but before another task(or rendering) begins. That way the current task can collect all its state changes and apply them all at once. I’ve seen a few variations of this approach. Some libraries (Vue, Ember, Knockout) only do partial defer, deferring the rendering/downstream updates but change the readable state immediately which is not without consistency issues. Others, like React, apply all changes at once, but it means during the same task other parts of the code won’t see the state change until it is later applied, which can be very confusing to the unaware.

### Windowed

This is done by providing an additional construct outside of just setting the data to wrap a series of changes so that change is not propagated outwards until the function wrapper completes execution. This is used usually together with immediate updates as a means to batch changes where applicable. Again this requires being conscious of update timing. But unlike deferred, after executed the data is immediately there and consistent. MobX Actions/Transactions are examples of this. Angular uses a similar technique automatically with the way it wraps events.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*dqXFEblx99K0yGBOZn6mMQ.jpeg)
## Putting it Together

It probably should come as no surprise that the decisions in terms of each Granularity, Propagation, and Scheduling lends to some common combinations since they work well together. This is what I was posed with evaluating when figuring out how I wanted to manage state.

### 1. None

- Granularity: Leaf
- Propagation: Top-Down
- Scheduling: Manual or Windowed
- Examples: LitHTML, DOM rendering micro-libraries

While not technically none since they need to push to the renderer, these libraries generally are pretty minimalistic. The benefit is that you can build a system for managing state on top of them usually pretty easily, but they themselves are for most cases insufficient on their own as change management libraries. These can be ideal candidates for Renderers for the 3rd piece of the modern Component Framework, but aren’t really a consideration here.

### 2. Immutable Stores

- Granularity: Root
- Propagation: Top-Down
- Scheduling: Immediate
- Examples: Redux, Freezer

Without a doubt these have their place. Outside of the Components in Stores and Services I would definitely be using these libraries. Their control and transparency is unparalleled which is absolutely necessary when managing data cross boundaries. However as a local state solution for my Components they leave a bit to be desired. These much like Controllers of old expect complete ownership of their domain and while there are patterns for nesting, ephemeral state has generally to be owned from the top with these libraries. One could make multiple roots throughout your render tree but you’d have to develop different ways to synchronize. These tend to lend to more verbose declarations for something that we know we want to slice up anyway. This generally lends to creating something like Immutable Components to wrap them anyway.

### 3. Immutable Components

- Granularity: Components
- Propagation: Top-Down
- Scheduling: Deferred
- Examples: React, React Clones, many Virtual DOM libraries

You can’t really go wrong with Immutable Components. They keep a simplistic interface, usually of setters which trigger updates accompanied by lifecycle functions. Given these are designed to handle nested state at minimum there needs to be hooks for disposal and for when data changes come from above. These conveniently can be made part of the Container construct (the Component Class) for these libraries. However given the lifecycle is so ingrained into the Components it is difficult to separate these libraries from their Renderer or Container. When you buy in to one of these you buy into the whole solution. This means that they are often less of a natural fit into Web Components. By all means one can use a lighter version like Preact to this application but things like Context, and Change Detection needs to be duplicated to link these libraries in.

Lifecycle functions also tend to split data flow out in an imperative way rather than a declarative one. Instead of defining what the data does in one place you tend to split it out across multiple lifecycles. And often without knowing what specific cycle methods are, lends to lazy developers overloading a single method in huge switch statements. It’s more a matter of preference but lifecycle functions are not new and this comes with the territory.

When optimizing this sort of change management generally you memoize methods or blacklist change. This has the benefit that your code will either not be running when you expect or it will run properly but rarely will you do unnecessary work.

### 4. Key Value Observable (KVO)

- Granularity: Observable
- Propagation: Events
- Scheduling: Partially Deferred or Windowed
- Examples: Angular, Vue, MobX, Knockout, Ember

This is probably the only approach made portable(not tied to a Component Lifecycles) out of the box. However there are just as many examples of ingrained frameworks here. The problem is that without the invisible mechanization done by the framework(like Angular’s zone.js) these libraries tend to have a more verbose API. Where Immutable Components rely on Setters usually, KVO requires both Setters and Getters. That is since they are based on subscription of nested trees generally all tracking and evaluation is automatic. This might seem like “magic” to some but you can view it as a memoization technique. A similar method could be used for Immutable Store selectors to automate the creation of mapStateToProps type methods found in Redux.

The benefit here is that change propagation is a concept for these libraries and you control the granularity giving them ultimate flexibility. It helps them interface with Reactive Streams like RxJS more naturally. Declarative Data is a real thing with this approach. Much like with the View you can set and forget.

However there is a real cost here in initial run and tear down. These libraries have been historically slow in their Rendering techniques and supported less explicit data flow like 2-way binding (even though that is by no means a requirement here). Nesting is completely a thing with these libraries but since you have to set the observed points it generally requires wrapping and mapping your objects to a specialized data format that implements those Getter/Setters and handling their disposal. Since this approach generally predates Immutable Components it is safe to say they have left some things in developer experience wanting otherwise the former may have never come into existance.

## So…

Unsurprisingly there is no silver bullet. I knew for what I was working on that I generally had a bias towards Observable, Events, Windowed but having worked with KVO libraries for almost a decade while doing one off projects with other approaches I have grown to really like how nice it is to not have worry about how to map all your data to just iterate over it again in the Template. For growing and refactoring a project I felt KVO’s Declarative Data a far superior pattern but how do you teach new Developers all these things when they are just trying to throw data on the page. And how do you justify these approaches if the marketing would have you believe they are not performant.

This always sat with me wrong as KVO done properly should for most operations be atleast in theory more performant than Immutable Components on most operations, the ones that involve partially updating the data on a page. So I tried my hand a few different approaches and did notice that the performance didn’t have to be as poor as the major KVO libraries. And then I found Adam Haile’s [S.js](https://github.com/adamhaile/S). It had a new take on how to handle disposal using context wrappers that was clean and best of all the library is very small with unparalleled performance.

On the other side having tried to solve the issues I’ve had with KVO over the years I found an approach using ES2015 Proxies that removed the need for explicit windowing in change detection and mapping. I put the two together and to my great excitement and relief the performance is incredible. I present to you Solid.js.

Github: [https://github.com/ryansolid/solid](https://github.com/ryansolid/solid)

Don’t believe, look for Solid in the Round 8 of the [JS Frameworks Benchmark](https://stefankrause.net/js-frameworks-benchmark8/table.html)

But the story isn’t over. How that performance was achieved is almost as much in the renderer as it is in change detection. I wanted to first impress the challenges of ergonomics and developer experience when developing Solid, to even better appreciate it against it peers when we dive into the pure performance techniques and approaches to rendering in the [next article](https://medium.com/@ryansolid/b-y-o-f-part-4-rendering-the-dom-753657689647).