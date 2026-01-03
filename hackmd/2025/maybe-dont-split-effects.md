---
# System prepended metadata

title: Maybe Don't Split Effects?
lastmod: 2025-04-13
---

# Maybe Don't Split Effects?

I know I made a big thing about splitting effects the past few months. And you know what? It is completely the correct conclusion. Just like you shouldn't write to signals in pure computations. Just like a whole bunch of other similar rules. You follow the rules you get great results.

The React core team has a term for this:

[***Falling into the Pit of Success***](https://blog.codinghorror.com/falling-into-the-pit-of-success/)

Sounds good but then why do so many people have a hard time with creating performant optimal React. Well because even if it is one of success, you are still falling into a pit.

Now this is generally a good idea. If people find software too hard to use it won't be very useful for them. However, what I've witnessed over the past few years is the rules get so strict people can't make sense of stuff anymore. Like it isn't a pit we are talking about now but more like the Conveyor belt of Success. I think I may have seen this ride at Disneyland.

So what am I getting at? Sometimes people want to do what intuitively makes sense no matter how incorrect or detrimental it is. You can't always protect them from themselves. Sometimes the correct solutions are too ahead of themselves. If through stricter rules people can't reason about what they are doing, what's the point?

So, I've been sitting with it the past month and have been trying to see if Ive missed anything. If I truly understand why split effects feel so bad. And if the argument for non-splitting could be made.

## 1. User Effects don't participate in Rendering

Render effects 100% need to be split because we need to be able to Suspend, and Transition without Side Effect. But if Transitions are a visual thing(note I recently stopped referring to them as Transactions) then user effects don't need to participate.

### Tradeoff

With lazy computations some pure nodes won't run during the pure phase as they won't be read until later. You can't use them to read from the DOM. You shouldn't really anyway. But pre-render measurement to post-render measurement to do things like flip animation require 2 effects. Render for pre and user for post. Where are single split effect could do it.

That's fine assuming measuring was guarenteed to run before render. I mention it because I recently hit an issue where order of reactivity tracking caused havoc on effect execution order because dependencies got read first higher up causing that branch to notify and queue first even though the effects were declared in opposite order.

In general relying on order of effects is tricky. You can rely on the front half running before the back, and the back of render before user. So this flip scenario is fine.

Other thing of note Render Effects run both halves immediately initially. So refs from later aren't there yet. After initialization the front half creates refs, so back half of one declared earlier could conceivably get it. But that is no different than today I suppose. But it suggests most element augmentation will happen in user effects.

## 2. Explicit tracking with any depth feels awful

Now this is a Store only issue for the most part but it is real. If a Signal holds an object or an array it is understood the whole thing needs to be swapped to trigger change. So this feels fine:

```js
createEffect(list, list => {});
```

But once it can be updated granulary it is awkward. Pushing an item, or swapping an index won't trigger it. If it did we'd never see granular tracking.

```js
createEffect(() => list[3], item => {});
```
You wouldn't expect someone adding to the end of the list to trigger this. However, if you iterates the list in your operation you wouldn't expect needing to iterate over it first to track to just iterate over it again to do.

Now Stores technically create a separate signal to track the whole array so they can have either behavior, but we can't just assume it is top level in what we return from the front half. We'd need to iterate it all anyway. And doing that gets us back to above where maybe we don't want that behavior.

Stores for the most part aren't async as except for getters they aren't derived and in that case that isn't deep. Projections on the other hand have a singular source function so the second you read anything from it, if the  source is async the whole projection short circuits.

So really deep Signal bags are the only place async gets us in trouble. Reading at the top of the effect probably is reasonable enough advice. Picturing deep traversal async erroring out midway is probably pretty pessimistic. More than likely it throws async immediately.

## 3. Error Handling + Async Throwing is Awkward

Once you split things you need to consider source errors different than effect errors. Not that combining them is great either. You need special try/catch or you catch async. You can't use the built in. Error could still be seperate handler I suppose but really what you want is to catch read errors there and locally manage errors in your effect.

There is a tension here, that async brings to the surface. If you view your effect as oblivious to reactivity you would be able to use normal try/catch in your code. This works with split effects because reactivity is stripped. But if you are conscious of the reactivity then all effect code becomes part of the system. You can't expect arbitrary 3rd party code to work.

Deeply nested reactivity blurs the line. And you kinda want it to.

## 4. Combined Effects probably want to Tear

If we were to keep combined effects it feels like you'd be more likely to want tearing. It feels less disruptive to have the effect trigger and bail out every time something is loading. That's right.. in the new async going to loading triggers reactivity when not tearing. It is a state of things. So queuing actual work around it seems terrible.

Remember:
```js
const a = createAsync<"a">(fetchA);
const b = createAsync<"b"> (fetchB);
const c = createAsync<"c">(fetchC);

createEffect(() => {
  console.log(a());
  console.log(b());
  console.log(c());
});
```

Like it isn't just the problem with what order to A, B, C console.log or what side effects get run each time, but unnecessary work as things come in and out of async. It is important to track like this to notify downstream things they are async pending in case there are new subscriptions.

So after initial load the situation of what logs gets so much worse. What if `a` is resolved and we retrigger `b`. `a` might run 2 more times. This is an argument for keeping unrelated effects seperate for sure, but what I'm getting at is even if they aren't completely unrelated your conditional effects might execute in more ways than you expect.


## So?

Well this is a bit of a mess really. Even reviewing this it is way cleaner to view stuff as in and outside of the reactive system. But doing granular effects is a super power overlapping stuff allows. But maybe that is a super power that only should exist inside.

As hard as I try to make the argument combined effects really just are a negative. Not even considering  how split effects do things like forcing write after purity, clarify the stale cleanup problem. And if resumability is ever a thing you want split effects so you can run deps on the server without running the effect.

I was hoping this exploration would give us room to keep `createEffect` as is and introduce split effects as a different primitive. We could still do that but it's pretty hard not to slap a big deprecated label on this one. It just isn't good.

If split effects are clearly the way to go I need to come up witha reasonable solution for nested reactivity. I will explore that in my next writeup.