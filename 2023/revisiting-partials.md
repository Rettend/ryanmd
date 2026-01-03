---
# System prepended metadata

title: Revisiting Partials
lastmod: 2023-11-09
---

# Revisiting Partials

I may have been too hasty dismising Fresh 1.5 release. Not because I feel it solves the fundamental problem but it took a primitive approach to partials which shouldn't be overlooked. I was pre-occupied with the fact that nothing was solving the global state issue and that people kept on talking about HTMX like it solved something useful.

The value of these partials is not that you can spread HTML across multiple endpoints. That you can map it to file system routing. But that you can define a block that will be swapped/diff globally in the client. I'm not suggesting the average developer should be even thinking about it but it is a good building block.

## Problem with HTML as an API

On one hand isn't that what the Web is? You go to a page you get back the markup. Why not do this at a more granular level?

A modern web application is more than the collection of its distinct parts. Seperate entries only really works with detached state. This is fine with pages classically because the design of the web meant thats what you are stuck with. But on a sub-page level it is way too easy to get out of sync. Every used Github you know what I'm talking about.

A more measured approach is to feed updates back into a single render flow. Granular invalidations -> Centralized read/render. This mirrors the classic form POST/GET. Not to say that this isn't accomplishable with these APIs. You could view each endpoint as having a specific concern and have it return all the parts it would need, but I do wonder what the organization looks like if different pieces matter for different pages/other parts you are on.

## So why even look at this?

Even with a single centralized render we still need the ability to do the swaps like in the nested Router we built. 

So being able to create a `<Partial>` say for the Router, or each Route Outlet makes a decent amount of sense. And not tying it to the router is interesting option.

Like if `renderTo____` calls in Solid were given an option to be like you are rendering partials (maybe something that can be pulled off a header), that could be all we need to feed it back through. We'd just follow some rules.

1. Everything outside of the top most partials is thrown away from the response.
2. Partials being nested doesn't really matter as we only care about the top most one that is rendered.
3. Islands/Client Components can not be rendered in this flow. Their props will be serialized but they will not be run, until they render in the browser.
4. We still need a way to serialize/manage streaming data.

For points 1/2 the baseline is unoptimal re-rendering the page and taking out what we want.. like we do today with SolidStart's experimental hybrid routing.

However, if a properly designed Router could use these APIs it would know what to render, so it could skip the parts that aren't needed and the same topmost rules can apply.

The interesting part of 3/4 is that server component rendering would more or less be a known thing from Solid's SSR renderer. It would be like.. ok we are in SC mode more or less. All after initial renders would go through here, so this would be the crieria for setting the right criteria, and the format would be dicated by this mechanism.

What is needed in addition is client JavaScript APIs to handle the swap. Because I still believe the delegation should be owned by the router. It owns `<a>` and `<form>` but it will need to be able to go ok, I did an `action` and got this partial response, now I need to swap/diff. In so this part of `solid-js/web` is basically where the client side diff/island hydration code goes to live instead of SolidStart. It's core, not Start or Router.

The hardest part of this sort of direction is bundler awareness of Islands. As of now we only have Start(Vinxi) so that will likely be the basis for all official Solid templates.

## Reading between the Lines

SolidJS is a library, SolidStart is a JavaScript Framework, but not a MetaFramework. I'm kinda glad the core team owns Start not a 3rd party.

Because I imagine the Remix/Next/Sveltekit etc of our ecosystem will be built on Start not Solid directly. Atleast early days. We will check out most opinions at the door so people will be able to build what they want. Start doesn't have a router etc. Its responsibility is just bundling and SSR runtime.

SolidJS will have some new methods, but it won't be a framework. One could build stuff without Start for sure, but Start itself will be flexible enough to handle a lot of things. 