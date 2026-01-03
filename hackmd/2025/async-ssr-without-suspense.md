---
# System prepended metadata

title: Async SSR without Suspense?
lastmod: 2025-04-13
---

# Async in SSR without Suspense?

Yes. The short answer is yes but I want to dig a bit more into if this makes sense of not. And consequences of different ways this can be handled.

Which bring us to our first question. Should we wait for async when we encounter it outside of Suspense?

## Wait or Not to Wait?

Solid and RSCs have taken opposite approaches here. But Solid 1.0's approach didn't wait, and didn't really work in a lot of cases. Basically only `lazy` consistently worked. So async SSR without Suspense is basically a no in Solid today.

RSCs on the other hand treat the area above the Suspense as being held. In so if there is no Suspense stream rendering is indistinguishable from waiting for everything to resolve. This is pretty convenient as it lets opting in be more gradual and Next has used this to do things like PPR(Partial Pre-Rendering).

But RSCs are not isomorphic. They only run on the server so there is no consequence to them behaving this way. They can't update in the client. If a client component under them were to throw a Promise with no Suspense above it things would not go so well.

Now Solid's Async can work without Suspense in the client. It isn't a great experience but it won't crash. But does it make sense? Well if it is held on the server then we know that by the time we hydrate we will have all the async values resolved. Which means that any future update will tear predictably.

In a sense we just skip the fallback and continue from there. So waiting does work. Well atleast on the surface.

What happens if we encounter new async, `lazy` or data fetching behind a conditional. Then we are back to square one of not having a Suspense boundary above it and no fallback to show.

## Is Not Waiting an Option?

There are a couple considerations here:

`renderToString` has no ability to do anything but return a string synchronously so it if encounters async its options are limited. It either errors or it returns with holes.

The other consideration is what if we want to just stream the data? Not the HTML.

Now it is worth pointing out there is a difference between No Suspense and no Async reads. It is possible to do async and not trigger a read via some sort of guards (`isPending`, `latest`). Of course to do so is pretty intentional, but it does differentiate things we can control from what we can't.

The difference with the guards is that they wouldn't trigger Suspense anyway so they'd have to work if we were to have them. So in some ways this doesn't impact our decision. And since there is a way maybe that is sufficient for "data" streaming solutions.

Can they work I guess is a better question? Like maybe these avoid Suspense APIs are untennable. The biggest concern I see here is hydration. If the data hasn't resolved yet then hydrating in these cases should be more or less ok since the HTML and the hydration state will match. But there are some places that could fall apart:

1. Data loads before render on the server. Like what if some cases the data is loaded and others it isn't. If they aren't present at flush time we won't wait for them, so they won't be updated on the server atleast. If through some combination with Suspense they happen to be then I assume the data will have been sent to the client by the time that boundary hydrates anyway.

2. Data loads before the client is able to hydrate, but wasn't present at the time of server rendering. It would be awkward if it went to hydrate expecting HTML to resemble data not there but the data happens to be there and breaks things. You could delay the data in these cases until have synchronous hydration, but how would you know? The server side would have to mark things not read "async" under the Suspense vs things that are. What if in one place it is read and another it isn't. What if those are under different boundaries?

Technically the scripts appended at the bottom of the page run synchronously and in order. But they don't trigger actual hydration because the async page scripts might not be present yet. We'd almost need to have them be blocked by hydration to process. It's interesting.

Lazy is another interesting thing as it isn't something we can just serialize. Or haven't until now. Currently server finishes and serializes data triggering Suspense to hydrate but lazy code may not be present and it interrupts it. If we could hold off hydrating boundaries until lazy code has loaded it would make things way cleaner. But we'd need to encode where Suspense relied on certain code and hold it off until it was settled as well. If we wanted any predictability in terms of data resolution/hydration order we'd need to run the whole boundary synchronously.

## So is No Top Level Suspense a Thing?

It seems not waiting is complicated. Technically it could work but there are a lot of edge cases unless we can basically replay the timeline of the server on the client. I also don't think unless intentionally guarded not waiting is behavior we want. 

Waiting works in the simple cases but falls apart when something  new happens under a conditional. But this always the problem even with tearing Async. And it isn't really an option for `renderToString`. Suspense atleast lets sync bail out.

So maybe all of this is more about setting more general rules/perspective. Let's create a hypothetical ruleset.

#### On the Server

1. `renderToString` requires top level Suspense or guards. It doesn't have any of the complications with timing since it needs to fetch in the client anyway and doesn't wait on the server so we just error our if unguarded async makes it to the top.

2. Other render methods wait on top level async. We need to consider if we should respect guards that provide defaults.

#### In the client:

1. User effects can handle Async without Suspense.

2. Unresolved Async read in a render effect with no parent Suspense errors out. Unresolved Async reads must occur under Suspense, a Transition, or be guarded.

3. A new Unresolved Async read under an existing Suspense boundary logs a Dev Warning suggesting to use a nested Suspense or a Transition.

What this would do is SSR would work without Suspense (no loading state/streaming) but the second someone did any new Async used in rendering outside of routing (which is done in Transition, hence safe) it would error.

Does this save us from needing `deferStream` on `createAsync`? Only if value was read above topmost Suspense. This is something that could happen with MetaTags I suppose. Worth exploring.

So I think you could have an application with no Suspense if it was very basic.. ie no major UI changes outside of Router/Transitions but even then I'm not sure that would be great. But as a baseline that can be reasonable with "run-once". But almost immediately beyond that you'd want to have Suspense and we probably need to be pretty aggressive in directing people that way.

## Other Thoughts Related to Suspense Hydration

As I stated above, I think in an ideal world Suspense Boundaries would only hydrate when ready which relies on the execution from the server to gather the async resources. Since code/css other assets are not things we can just serialize I believe, we need to communicate to the client to load these assets and hold off things that need them until they are ready. It's tricky though because I believe it is possible for lazy imports to have different hashes between client and server so trying to map it back would be a challenge to do core.


