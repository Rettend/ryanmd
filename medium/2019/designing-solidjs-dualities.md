---
title: Designing SolidJS: Dualities
lastmod: 2019-09-02
source: https://ryansolid.medium.com/designing-solidjs-dualities-69ee4c08aa03
---

Member-only story

# Designing SolidJS: Dualities

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/?source=post_page---byline--69ee4c08aa03---------------------------------------)[Ryan Carniato](/?source=post_page---byline--69ee4c08aa03---------------------------------------)Follow10 min read·Sep 3, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fp%2F69ee4c08aa03&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fdesigning-solidjs-dualities-69ee4c08aa03&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--69ee4c08aa03---------------------clap_footer------------------)211

2

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F69ee4c08aa03&operation=register&redirect=https%3A%2F%2Fryansolid.medium.com%2Fdesigning-solidjs-dualities-69ee4c08aa03&source=---header_actions--69ee4c08aa03---------------------bookmark_footer------------------)Listen

Share

A while back I attempted to write a [series](https://medium.com/@ryansolid/b-y-o-f-part-1-writing-a-js-framework-in-2018-b02a41026929) to describe what went into designing [Solid](https://github.com/ryansolid/solid), a high performing JavaScript UI library. It was too general, with each article trying to tackle too much. With Solid recently reaching 1000 stars on Github, I’ve decided to give it another go. This article marks the start of a new series that will be more focused on specific topics. It will require a basic understanding of the Virtual DOM and Fine Grained Reactive Programming(references below). It might be a bit too deep for those just wishing to use Solid, but I believe it could be useful for others facing similar challenges. A lot of smaller considerations go into designing a consistent system.

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*k4fren7_fn7T3C4OSYdYaw.jpeg)*Transcending Duality from Ray Rolando*

## Exploring Dualities

If there is one common thread I’ve seen when reflecting on topics around design is that things are never just black or white. Before talking about any specific technical choices I think it’s important to appreciate not only the scale from left to right but understand that often by slightly reframing the question to things that are seemingly opposite of each other can align next to each other. That stepping out or going far in one direction can wrap around to the other; Communism becomes Fascism, Infinity becomes zero, everything becomes nothing at all.

In programming and API design we also have dualities like this and I’ve found they…