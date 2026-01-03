---
title: The Unhealthy Obsession with JavaScript Bundle Size
lastmod: 2019-09-12
source: https://ryansolid.medium.com/the-unhealthy-obsession-with-javascript-bundle-size-bf0945184c86
---

Member-only story

# The Unhealthy Obsession with JavaScript Bundle Size

## Are we a bit too obsessed with size?

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/@ryansolid?source=post_page---byline--bf0945184c86---------------------------------------)[Ryan Carniato](/@ryansolid?source=post_page---byline--bf0945184c86---------------------------------------)Follow7 min read·Sep 13, 2019[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fswlh%2Fbf0945184c86&operation=register&redirect=https%3A%2F%2Fmedium.com%2Fswlh%2Fthe-unhealthy-obsession-with-javascript-bundle-size-bf0945184c86&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--bf0945184c86---------------------clap_footer------------------)386

5

[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fbf0945184c86&operation=register&redirect=https%3A%2F%2Fmedium.com%2Fswlh%2Fthe-unhealthy-obsession-with-javascript-bundle-size-bf0945184c86&source=---header_actions--bf0945184c86---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*fBM3V0gg-18e0IOCajWdCQ.jpeg)*Woman measuring her tummy from rawpixels.com*

Disclaimer: this article doesn’t suggest you shouldn’t be looking at your application bundle size with interest. The median size of JavaScript has been growing year over year to a place we shouldn’t just accept that. We should be aware of the decision to use libraries. More this is focused on the race to the bottom for libraries competing purely on their bundlephobia.com scores. It can be misleading and often smaller isn’t always better.

I wanted to take a moment to talk about what I consider the most overhyped facet of JavaScript performance these days: Bundle Size. What I’m talking about is after all the minification and uglification the size in kilobytes that you end up sending to your end-consumer. We all know that smaller is better. Less to transfer over the wire leads to quicker page loads. A few hundred milliseconds is all it takes to go from fast and smooth to slow and clunky. It’s as much of a perception thing as any. But it’s an important consideration.

So how did this became such a hot topic? For years as JavaScript libraries became more sophisticated and their capabilities grew and more and more work got offloaded to the client that was classically done on the server. Before long what had once started as a few simple libraries had…