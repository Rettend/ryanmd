---
# System prepended metadata

title: The Genius of the VDOM
lastmod: 2025-07-25
---

# The Genius of the VDOM

Probably the last thing you expected me to write but it is important to understand the powerful abilities of alternative solutions if you want to create the best solutions. And there is some real genius here, whether initially intentional or not.

To start the VDOM approach is not a particularly optimal way of diffing as a baseline. It creates artifacts just to compare which carry overhead versus diffing the inputs. At it's core when fresh data comes in it has no idea of what has changed and needs to diff everything from the point of change. It doesn't even necessarily have a way to shortcut that diffing.

...Wait. What about memoization? Well notice how almost no one was talking about memoization before React Hooks? It was because we were less performance aware. Without having a unit smaller than a component it wasn't nearly as common to have to deal with the way data linked together. Don't get me wrong there was `shouldComponentUpdate`. But React chose to take a broad stance early because there is always the worst case. There is all fresh data from the server which will not be equal, and users simply doing things like:

```js
const list = this.state.list;
list.push(newItem);
this.setState({ list });
```
I know a bit odd by current standards but people still do this today. And the problem is the array is the same reference so if we just auto-memoized props etc this would never show updates. In this example `this.setState` is more like `this.renderComponent` but that is the baseline.

For the same reason it can never depend on knowing what references are the same so for things that need to keep identity through moves like items in arrays you should be assigning a `key` property. That way it knows how to match things up.

So a VDOM as far as diffing goes is sort of dumb. It doesn't necessarily leverage the power of immutable diffing or the fine-grained ability to not re-execute of mutable systems with stable references. When fresh data comes from the server even today you are basically re-rendering the whole page. Yes you aren't necessarily updating the DOM everywhere but the whole process is running top to bottom.

## Sounds Stupid... How is this Genius?

Well we focus a lot on emphasizing the benefits of both push and pull when introducing people to Signals. Push systems only notify things that are related to change, and Pull based systems only do the work that is relevant. Push-pull like Signals combines the benefits of both systems, having the best update characteristics of both systems. They only notify the things that can change and only do the work that is relevant to that smaller scope.

Let's go back to the Pull benefits of the VDOM. "It only does the work that is relevant". If you have a large amount of data, but your VDOM is only looking at one item in it currently that is the only thing it is mapping over and diffing. It literally could care less about any other data existing in the universe.

```js
function Component() {
  const [state, setState] = useState(giantDataBlob);

  return <Item item={state.items[0]} />
}
```

It doesn't need to even be aware it exists. If fresh data comes from the server and replaces the old data it happens at no consequence. It doesn't diff anything it doesn't use it just throws it away. It's consistent because it has the fresh data available but it doesn't have to deal with any existing references that aren't used.

Now if a different component uses a different part of the state it would also need to be set as well so their are concerns for synchronization but it is understood that each location in a VDOM is independent and things need to enter its state in order for it to update.

But for that reason state isn't really ever truly shared. Anything that could share state actually is a descendant of the source of that state and would get re-rendered anyway on state change. It doesn't truly exist in multiple locations unless it is a copy conceptually.

Which works nicely in VDOM's favor because while it isn't an immutable system, if you make your state immutable which you can because paths essentially are the identity in its tree structure, you can leverage immutable optimization when it comes to diffing. The React compiler is a tool for creating stable references and auto-memoization. But you can also optimize by hand.

So the result is you have a system that when diffing only diffs what is being used and has plenty of options for shortcut optimization. So while nowhere near as optimal as fine-grained rendering when living in a world where you have the ability to apply these sort of referential optimizations, it isn't that bad considering how bad it could be. When you are in a world where you have fresh data from the server though it looks a lot more appealing only dealing with what is used.

## The Pitfall of Granular Reactivity

Maybe I should talk about this more because while it is fairly obvious to me it may not be to everyone. It has always been about create vs update. The only reason today that Signals are the best of both worlds in pretty much all benchmarks is that you don't create what you don't need in these scenarios. And because these models are based off a stable reference, creation is different from update, so we've been able to leverage that. Especially because the DOM also is retained mode. Things like cloning elements can reduce the overhead.

We actually benefit from identifying what is dynamic vs static. And we avoid doing unnecessary work where a VDOM isn't required to diff. Diffing begets more diffing generally, and these solutions just side step it. When you are working in a single environment without crossing serialization boundaries so many optimizations are available to you and fine-grained solutions tend to leverage them all.

I said pitfalls right? Well I'm just establishing why in the happy case fine-grained rendering absolutely trumps the VDOM. But what about when the data exceeds what is being used? Or the majority of data is constantly coming fresh from the server in less than granular chunks? Well it is easy to point at those inefficiencies and say fix them there. Like Ryan Florence's Stock Ticker demo is an attrocious way to build apps. But what if we do take these on.

Let's look back at our large data blob, this time with a big reactive data store:

```js
function Component() {
  const [state, setState] = createStore(giantDataBlob);

  return <Item item={state.items[0]} />
}
```

Let's forget Solid Stores for a minute and approach this generally. 

Now the most naive implementation of this would involve mapping over all the data upfront to make it reactive. Something like [Jovi's article](https://x.com/JoviDeC/status/1945775639992131751). That's definitely more expensive than just throwing data in a single Signal or single state variable. We use a Store here though because we want fine-grained updates. The cost of a few more signals down the path of what we use is no worse than the overhead of the VDOM, and on update we don't need to recreate everything.

But what about the other data. Creating all the signals for all the data we may never use is definitely expensive. And more so when fresh data comes from the server if we want to keep our nice stable references we are going to need to diff all the data to update those Signals we may never use. We could blow them away but at that point it might as well be a VDOM as now our UI layer will need to do the diffing. Most fine-grained demos people made when React came out were like that because writing the diffing yourself was pretty tedious. Between that and the mapping it was easy to make mistakes on something that in React was just setting a variable.

So in a sense this is the worst of both worlds scenario for push-pull. Because something needs to be there to do the pushing there is upfront cost in addition to doing the necessary work which is diffing in this case. While diffing should be avoidable in 90+% of cases, it isn't always avoidable. Fine-grained solutions got a way with the fact that most big changes were client page navigations anyway so blowing more out than they need to in those cases were rarely felt since we are already dealing with large affordances and usually waiting on server data.

## Changing the Physics

Proxies essentially became the game changer here. Because we can use them to lazily create Signals. This removes the initial overhead. And things that haven't been created or are no longer needed, aren't going to notify downstream work. We have been using this to great effect in Solid for years.

However, I realized working on 2.0 that our diffing wasn't as optimal as it could be. We still diffed everything since we needed to update our fixed references. 

So I had an idea. If somehow we made the Proxy target malleable, swappable, we could just replace the things we didn't care about without diffing them. Since reactivity works via a chain, we actually know what is being used. If you break the chain of reactivity things won't update. So generally speaking you can trace the signals that are created through the store and those are the only values you need to diff.

And the results are drastically better. We basically hit the best of both worlds again. Using the laziness of reactivity plus the knowledge of the graph to only do exactly what is needed. Except then I noticed [this](https://playground.solidjs.com/anonymous/debeda26-eca5-4002-a6da-c840b99e37a8):

```js
const [store, setStore] = createStore({
  a: { prop: "hi" },
});

createEffect(
  () => store.a.prop,
  (v) => console.log(v),
);

setStore((s) => {
  s.b = { b1: s.a };
});

setStore((s) => {
  reconcile({ b1: { prop: "yo" } }, "id")(s.b);
});
```

This unfortunately only logs the effect once. And it makes sense why it does. No one is listening along the path through `b` so when we diff it shortcuts early and replaces what isn't used. It is updated but it has orphaned `a`.

Now this makes a lot of sense in a VDOM or an immutable system since you can't expect shared references to continue to react, but not so much in a mutable system. It would be weird if you assigned an object then updated it and it not show that update. This happens in Immer, but pretty much nothing else.

So something has to give. Either we:

1. Restrict the rules around diffing.
2. We opt for v1 style less optimal diffing.
3. We restrict rules around stores, or type of stores. 

I think 1 and 3 are interesting to explore. The fact that today thanks to proxies this isn't just an impossibility gets me excited. And my gut is that I'm not done learning things from React.


