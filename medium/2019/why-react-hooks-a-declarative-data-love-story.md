---
title: Why React Hooks: A Declarative Data Love Story
lastmod: 2019-01-18
source: https://ryansolid.medium.com/why-react-hooks-a-declarative-data-love-story-bcaa73d61389
---

# Why React Hooks: A Declarative Data Love Story

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/?source=post_page---byline--bcaa73d61389---------------------------------------)[Ryan Carniato](/?source=post_page---byline--bcaa73d61389---------------------------------------)Follow9 min read·Jan 19, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2Fbcaa73d61389&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fwhy-react-hooks-a-declarative-data-love-story-bcaa73d61389&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--bcaa73d61389---------------------clap_footer------------------)162

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fbcaa73d61389&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fwhy-react-hooks-a-declarative-data-love-story-bcaa73d61389&source=---header_actions--bcaa73d61389---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*ZugxrkadDI-z9I874yxt3g.jpeg)
I’ve read a lot of articles recently introducing React Hooks presenting them as finally the solution to mixins to understand why they are the next big thing. And I agree they are a big a deal. In fact, I believe they potentially are a bigger deal than what is generally understood today. I’m not going to introduce you to Hooks in this article (Dan does a much better job [here](https://medium.com/@dan_abramov/making-sense-of-react-hooks-fdbde8803889)), but instead explore how we actually got here and what it means. It’s more than a community chasing down the perfect pattern for mixins, and I believe it’s impact could represent a change in mentality much more fundamental.

## Component Lifecycle

React was introduced from day one with a Component model. Its lifecycle methods and imperative data flow were the perfect match for the newly introduced Virtual DOM. A Virtual DOM works by batching up changes against a Javascript DOM representation that is diffed against the actual DOM or a previous run, before patching just the changes on the real DOM. What this means is there is a clear render cycle that runs top down from the source of any change to ensure all descendants are updated. Lifecycle methods are the perfect way to package up each step of the loop in a more granular way. Every time a Component is initiated, props come in from above, the decision is made to re-render, etc…

In practice this introduces 2 constraints that are often taken for granted:

- The boundary for code modularization must align with the change management/performance concerns of the Framework.
- Much like using innerHTML the render method of a Component is a full replacement and runs to completion every loop.

On the surface these are not terrible tradeoffs but they inform a lot what came to pass. React’s innovative approaches over the years have largely been attempt to overcome these 2 limitations.

## Functional Components

Or Stateless Components as they are often called are simple Components that instead of being represented as a Class with lifecycle methods are a single function. The aforementioned render function. Hence, why they are “stateless” since every render is a new execution where nothing is preserved.

So why even have them? Sure not all Components need to have internal state so this is a convenience, but why fracture the existing patterns?

I have a theory about this. When you first get introduced to Components or any sort of fractal composable pattern you picture how much work it saves you by letting re-use it as you wish. You picture encapsulating the complexity exposing an easy to use API. Wonderfully DRY and flawlessly interoptable. In practice, the opportunities to re-use are not as prevalent, increasing the number of boundaries increases overhead, and premature optimization through separation only makes it harder to redefine boundaries as you understand the problem space better and seek to scale the solution.

React Components for better or worse do not actually give you that flexibility. To properly leverage the nuances of Virtual DOM performance there are specific boundaries to your Components. However, it often means making several Components where you otherwise probably wouldn’t have. This comes with the previously mentioned tradeoffs. Now you are facing problems like “prop drilling”, where you find yourself trying to pass data down through several nested Components. These are not new problems but are just much more pronounced when the code boundaries can not reflect logical boundaries.

Well, we can solve this with moving more data to shared Stores in conjunction with Dependency Injection with the Context API. While we are at it, why don’t we keep things clean with [“Smart” and “Dumb” Components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0). The “Dumb Component” at that point doesn’t need to be any more than just a Render function. The code that interacts with the Injected Data, “Smart Component”, has a reasonable amount of mapping boilerplate that might even be domain specific. At a certain point composing this behavior behind functions just makes a lot of sense. Enter…

## Higher Order Components

There are very few actual problems with HOCs. They are a very reasonable way to compose behavior. Yes naming collisions are possible, and without knowing the specific behavior of each HOC you won’t know how they interact with each other. But that is like anything. This is a scaling issue. A couple HOCs no one cares. A dozen and maybe there is cause for concern.

Introduce [Recompose](https://github.com/acdlite/recompose). It is not the only library of its nature but it is definitely a prime example of this approach. As it turns out people really liked dealing with function Components. Recompose documentation goes as far as calling out that an “idiomatic” React application should mostly consist of them.

It is not terribly surprising, that this gained steam. Lifecycle methods can quickly become a bit of a mess and it doesn’t take spending a couple years with ASP.NET webforms(Truly the dark ages of Web Development) to get to that conclusion. Even if you present clear pipeline some Junior Developer on the team is going to stick all their code in a single lifecycle method everywhere, and by the 3rd or 4th time you come back to something the nested tangle of conditionals is going to make navigating through one like solving a Sudoku. Not to mention you actually have to trace through multiple lifecycle methods in multiple components to really understand what’s going on.

## Declarative Data

See stacking a bunch of HOC’s has another interesting side effect. It breaks apart functionality even smaller yet has to present each part succinctly as the configuration for each HOC. By pulling this out of the always re-running render function you achieve something I call Declarative Data. You describe the data and all it’s potential transformations in one place not split by lifecycle methods as big blob of configuration of sorts. While not the idealized form (I will discuss this in a moment) you don’t have to go hunting for what you are looking for.

A reasonable number of other libraries use this approach. I mean consider configuring a Component in [Vue](https://vuejs.org/):

Vue.component('button-counter', {  data() {    return {      count: 0    }  },  methods() {    return {      increment() { this.count++; }    }  },  template: `    <button v-on:click="increment">      You clicked me {{ count }} times.    </button>  `});If you squint a bit the Recompose version looks kind of similar:

compose(  withState('count', 'setCount', 0),  withHandlers({    increment: ({setCount}) => () => setCount(count => count + 1)   }))(({count, increment}) =>  <button onClick={increment}>    You clicked me { count } times.  </button>)I mean data and state, handlers and methods, string HTML templates and JSX, React and Vue have never looked so similar.

## Embracing Hooks

I guess I should mention Render Props at this point since briefly they were all the rage. They are just a fancy way of saying you can wrap JSX in a function and pass it onto a Component whether through a prop called ‘render’ or through JSX children. In that way you can create Components that create function contexts for their descendants. This pattern tends to scale horizontally, literally, as you get nested components and callback functions essentially.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeThe one common theme if you haven’t been paying attention is every problem we try to solve just means more and more Components. Specialized, special purpose Components with varying specific patterns of use and still all constrained all the same. Nothing we’ve done has made things actually simpler and I’d be surprised if any part of our application (non-library) code is actually any more re-useable. I say that a bit facetiously, as our naive expectation of Components was never going to be satisfied completely. The real value of Components is that they are small and modular so they are that much easier to throw away when we need to rewrite, but that is only true when they carry the right boundaries.

So why are Hooks finally the answer?

Do you remember the first program you ever wrote? What did it look like? Was it this?

var name = 'John';// Prints "Hello, John" to console window.console.log('Hello, ', name);Or perhaps something like this:

public class HelloWorld {    public static void main(String[] args) {        // Prints "Hello, World" to the terminal window.        System.out.println("Hello, World");    }}You know you maybe had to setup an entry point function, and maybe declared and set a variable, and then rendered an output. You didn’t have to wrap your code in a HOC. You know Hooks kind of look like that too.

function Main() {  const [name] = useState('John');  return <div>Hello, {name}</div>;}What Hooks do is finally let you write your React code without explicit lifecycle methods, group your data in an idealized Declarative way (where you can arrange your code around the piece of data rather than the process), and not have to be as mindful of the fact the function re-renders continuously. They are reusable and composable independent of the Components and can describe in an encapsulated way very complex behaviors. Best of all, they just feel natural.

## … Here’s the Rub

There’s always a but. Although it is not so much with Hooks themselves. I mean they have some caveats, like needing to be top level and non-conditional so that they can be matched up. I’ve spent some time developing Hooks and it can be tricky for the creators of libraries to navigate some of the subtleties because you have to be very aware of the fact the Component does in fact re-render when considering how the memoization works. If you aren’t careful you will be wrapping closures around temporary versions of variables and really be sprucing up boxing values to keep references to value types. But largely I am optimistic that will not be the average developer’s experience.

No, the real question is: Why did it take so long to get here?

If [Recompose ](https://github.com/acdlite/recompose)sort of looks like [Vue](https://vuejs.org/), Hooks sort of look like a Fine Grained Change detection library like [KnockoutJS](https://knockoutjs.com) from 10 years ago. Maybe you aren’t familiar with Knockout but maybe you have heard of [MobX](https://mobx.js.org/), a spiritual successor. These were the libraries and programming patterns that existed when React showed up on the scene. Here’s an example of setting a counter with React Hooks.

// Reactconst Counter = () =>  const [count, setCount] = useState(0);  useEffect(() => {    const h = setInterval(() => setCount(c => c + 1), 1000);    return () => clearInterval(h);  }, []);  return <div>{count}</div>}And a modern Fine Grained library called [Surplus](https://github.com/adamhaile/surplus):

// Surplusconst Counter = () =>  const count = S.data(0);  S.effect(() => {    const h = setInterval(() => count(count() + 1), 1000);    S.cleanup(() => clearInterval(h))  });  return <div>{count()}</div>}While the JSX makes for a really nice comparison here and Surplus can only make the claim that it’s been this way for a couple years. This pattern is largely unchanged for over a decade and every Fine Grained library has these sort of tools.

There really are only subtle differences. React having to provide the dependencies to the effect and Surplus using a single function as a combo getter/setter. This code example is meant to be illustrative rather than accurate. In Surplus the S.effect is completely unnecessary in this example as it does not have the same constraints as React. And that’s the real point of interest here. I’m very supportive of Hooks because I believe in these Declarative Data patterns, but React is still constrained by the its Component Lifecycle. The 2 constraints at the beginning of the article are still true here. Hooks are only a way to make the API more natural but do not fundamentally change the nature of React state in a way that lets the developer define logical boundaries nor changes the fact that the render function is run every loop.

These are not constraints shared by Fine Grained libraries. They only run the initialization code once and only update what has changed. It means that weird optimization concerns like not declaring your functions in the JSX or the need to separate out Components to implement shouldComponentUpdate or to use React.memo are just not a thing. This just cascades into benefits of not prematurely creating boundaries reducing the need for many of constructs(Components beget Components) reviewed in this article and allowing for easier adaptation as the project grows.

The performance of Fine Grained libraries are nothing to be sneezed at either. They have a dominating presence at the top of the [JS Frameworks Benchmark](https://krausest.github.io/js-framework-benchmark/current.html) (Solid, Surplus, Knockout JSX, MobX JSX) flanking ivi the only VirtualDOM library at the very top of the charts.

## Conclusion

I’m very excited and already enjoying the time I’ve been spending with React Hooks. The API feels very natural to me and it gives a dimension to React I never dreamed possible. Their API design is progressive. So much so, [SolidJS](https://github.com/ryansolid/solid) has taken the last few steps to bridge the gap in API with Fine-Grained reactivity while maintaining its top-of-class performance.

React pushing out Hooks now is big validation that the mentality and approach to patterns of Fine-Grained Declarative Data are something worth doing if not straight up the future. It was always the constructs around explaining effects and reactive data patterns when juxtaposed against something like React made React look much more attractive. But if this is the new React that changes everything beyond just React itself. I realize it is probably too hopeful to think this approach would be ubiquitous. But I remain optimistic.

I am just sort of left wondering if the inferior approach/technology won out and it took 6 years to realize the mistake — picturing where’d we be if the great minds at Facebook had been working on this the past 6 years.