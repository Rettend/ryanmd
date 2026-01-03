---
# System prepended metadata

title: Run(Throw) Once V4
lastmod: 2025-02-09
---

# Run(Throw) Once Async V4

As some you know I've been trying to find the ideal Suspense pattern the past year or so, but reverted back to the classic pattern 6 months ago when I started my work on Solid 2.0.

[Why Run Once Doesn't Work](https://hackmd.io/@0u1u3zEAQAO0iYWVAStEvw/S1ZMBwPekg)

I often share ideas with Dominic from the Svelte team and were talking about Run Once Suspense. I immediately went on to explain why I thought it didn't work. And unsurprisingly he showed me examples with the exact problems I was talking about.

But he seemed really intent on the approach. Ergonomics are paramount for Svelte. You know how sometimes when you teach someone else you learn something. While I was being adamant about the problems and spelling it more clearly than before, I heard what I was saying and realized the solution.

Unpredictable Tearing of the UI was what ultimately swayed me away from Run Once. So why don't we just not? What if we only visually opt in to tearing in a predictable way instead?

## Rendering is Special

If Dominic deserves credit, so does Dev. He has been pushing an approach where user effects don't trigger Suspense, Transitions, or even ErrorBoundaries. Since they don't impact rendering they don't need to hold the fate of the UI tree. Things will be consistent eventually and since we always query the latest and block on async it will be ok.

So what does this have to do with Run Once?

Well, I created the `latest`/`resolveSync` helper I talked about previously. The trick to it was to switch a global toggle during its sync execution to change modes on async to not throw. Then it would try to resolve. If it hit `undefined`s and errored out that was fine, we'd consider it `undefined` and move on. This approach was shallow since it didn't require tracing sources or for them to resolve differently outside of the leaf read.

I created this so people could opt out of Suspense for previously resolved things via `resolveSync(asyncSignal) || asyncSignal()`

With Run Once previously I thought this could be the default but realized the issues above. No. We need to throw by default to prevent overfetching/overrunning effects.

But what about UI? If render effects were once again different would that be OK? What if the whole graph blocked and held but render effects tore. They grabbed the latest value and only threw if they had never resolved.

Since Render Effects are at the edge of the graph nothing depends on them and since this mode switch is shallow it can be independent of the rest of the graph. The async propagation can happen completely correctly throwing as needed but the rendering can not care. It can tear predictably as well since for it nothing is blocked. You won't display the same Signal with different values because one location threw before it rendered. Throwing from render still always triggers Suspense. It just won't need to throw in these cases where it has resolved before.

## Exceptions

This isn't without consideration. Mostly doing this approach means existing async never triggers Suspense/Transitions. If a navigation updated an id that changed tab and async data, you'd see it go to the new tab showing the old data. This is expected though. A system that tears will tear. If new data is fetched below no such problem. Honestly routing should use Transitions 

Transitions similarly wouldn't hold though. So render effects running under Transitions should forgo this mode switch and always throw I think.

Similar consideration around new render effects under a new Suspense Boundary. At first I was thinking all new Render Effects could throw but a change of `<Show>` component triggering some ancestors Suspense boundary is as jarring as anything.

Keep in mind if a similar `<Show>` switch created a new `createAsync` and reads it under the same boundary or reveals a new `lazy` component, it would go to fallback. But I think that is fine. It probably should be read under a new Boundary.

## Default Value problem

Sometimes people never want a fallback and just want to show a synchronous default. Well that is possible too. If every async has a default or you give a default value to a derived value then we don't need to throw rendering.

Sure `asyncSignal() || default` won't work. The default needs to come from a primitive's initial value. But this could allow for these experiences. 

I was concerned this would have issues with SSR but if the stream hangs on async resolution and not Suspense nothing stops you rendering the whole page with zero Suspense and have the promise to update that data resolve and stream it in after without the typical out of order fallback swap in. It would hydrate with the sync render and the other updated data would just apply after.

You could even use `isPending` with `<Show>` to show a fallback without Suspense and just stream the data in and do full client rendering. Suspense and deferStream are about server rendering HTML.

In general I suspect this Default would make it easier to have less Suspense boundaries. One at the top of your page might do enough to get started.

## Implementation

Since I already have the pieces I doubt this would be too much effort. I am most interested if this removes the need for `latest`/`resolveSync`. Reasonable tearing as a Default pretty much means the only place you might want it is in a non-reactive scope. But being non-reactive they won't run again so probably better off pulling outside like left side of an effect, or disabling the button while pending.

Its possible non-reactive scopes should only throw initially as well. They get to keep their non-nullable types this way and be completely safe after initial load.

So maybe this takes a little doing but reduces the need for special utility APIs. At the very least it feels like it is worth trying out.
