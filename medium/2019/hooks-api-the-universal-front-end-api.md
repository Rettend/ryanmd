---
title: Hooks API: The Universal Front-End API?
lastmod: 2019-02-02
source: https://ryansolid.medium.com/hooks-api-the-universal-front-end-api-a5b6b850d853
---

# Hooks API: The Universal Front-End API?

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/?source=post_page---byline--a5b6b850d853---------------------------------------)[Ryan Carniato](/?source=post_page---byline--a5b6b850d853---------------------------------------)Follow3 min read·Feb 3, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2Fa5b6b850d853&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fhooks-api-the-universal-front-end-api-a5b6b850d853&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--a5b6b850d853---------------------clap_footer------------------)75

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fa5b6b850d853&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fhooks-api-the-universal-front-end-api-a5b6b850d853&source=---header_actions--a5b6b850d853---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*0KaVRw9uugDiyPJ5LH9yeA.jpeg)
There already been a lot discussion about React’s Hooks API. It isn’t even officially released, and there are already a lot of opinions about what this means for the future of React and its ecosystem. However, I think Hook’s effect could extend well beyond React.

When React does something every competitor or would be Framework writer pays attention. First wave within a couple days there are new React Hook libraries everywhere. Within a week existing libraries are publishing how they interface with the latest and greatest. Soon after copycat libraries show up. And within no time at all it has been cemented as “the way” to do UI.

To the surprise of no one the proposed Hooks API has had a similar response. React did not invent the patterns they presented in their Hooks API. However, by promoting this approach they have legitimized them. So what? The number of ES6 Class based life-cycle methods Component libraries is too numerous to count.

What makes Hooks interesting is they are borrowed from the other way (Key Value Observables) to manage change in DOM rendering libraries. The approach used by MobX, Vue, Ember, KnockoutJS to name a few. They present themselves as composable primitives but they actually are a manufactured abstraction over React’s top down Component change management. This is actually kind of impressive as it demonstrates that pretty much all JavaScript Declarative UI libraries could sport the same API. Virtual DOM, Real DOM, KVO, Components, Web Components, whatever...

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeA simple counter with React Hooks:

const Counter = () => {  const [count, setCount] = useState(0);  useEffect(() => {    const t = setInterval(() => setCount(c => c + 1), 1000);    return () => clearInterval(t);  }, []);  return <div>Count: {count}</div>;}A simple counter with [Neverland](https://github.com/WebReflection/neverland) a Template Literal Web Component Library written Andrea Giammarchi:

const Counter = stardust(() => {  const [count, setCount] = useState(0);  useEffect(() => {    const t = setInterval(() => setCount(c => c + 1), 1000);    return () => clearInterval(t);  }, []);  return html`<div>Count: ${count}</div>`;})Or here’s an example with [LitHTML](https://github.com/Polymer/lit-html) with [Component Register Hooks](https://github.com/ryansolid/component-register-hooks):

const Counter = () => {  const [count, setCount] = useState(0);  useEffect(() => {    const t = setInterval(() => setCount(c => c + 1), 1000);    return () => clearInterval(t);  }, []);  return html`<div>Count: ${count}</div>`;}Or some KVO with no Virtual DOM. How about [Solid](https://github.com/ryansolid/solid), one of the top performers on [JS Frameworks Benchmark](https://github.com/krausest/js-framework-benchmark):

const Counter = () => {  const [count, setCount] = useSignal(0);  useEffect(() => {    const t = setInterval(() => setCount(count() + 1), 1000);    useCleanup(() => clearInterval(t));  });  return <div>Count: {count}</div>;}Or, [Surplus](https://github.com/adamhaile/surplus), another top contender using JSX:

const Counter = () => {  const count = S.data(0);  S.effect(() => {    const t = setInterval(() => count(count() + 1), 1000);    S.cleanup(() => clearInterval(t));  });  return <div>Count: {count()}</div>;}There are tons more and many predate React Hooks. But regardless of technology choices and how they mechanically work, the abstraction is essentially the same. There is some sort of trackable data and some sort of function closure over a computation (side effect, or memo).

So as a library writer knowing this, couldn’t I just target Hooks as a platform rather than a given Framework?

A library like [MobX React Lite](https://github.com/mobxjs/mobx-react-lite) is written on top of useState, useCallback, useEffect and useRef from React. It provides MobX capabilities through composed (Higher Order) Hooks to React. But if any library can provide these hooks, then MobX integration could work without additional effort for any library. This could be true for any Hook based extension in the React ecosystem. A factory method could extend them to any work with any library. I’m not sure if this will be a thing. But it seems like something worth trying.