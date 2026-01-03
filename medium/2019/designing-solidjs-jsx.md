---
title: Designing SolidJS: JSX
lastmod: 2019-12-01
source: https://ryansolid.medium.com/designing-solidjs-jsx-50ee2b791d4c
---

Member-only story

# Designing SolidJS: JSX

## How is it that the syntax born of the Virtual DOM is also secretly the best syntax for Reactive UI libraries?

[![](https://miro.medium.com/v2/resize:fill:64:64/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](https://ryansolid.medium.com/?source=post_page---byline--50ee2b791d4c---------------------------------------)[Ryan Carniato](https://ryansolid.medium.com/?source=post_page---byline--50ee2b791d4c---------------------------------------)Follow10 min read·Dec 2, 2019[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fjavascript-in-plain-english%2F50ee2b791d4c&operation=register&redirect=https%3A%2F%2Fjavascript.plainenglish.io%2Fdesigning-solidjs-jsx-50ee2b791d4c&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--50ee2b791d4c---------------------clap_footer------------------)31

1

[](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F50ee2b791d4c&operation=register&redirect=https%3A%2F%2Fjavascript.plainenglish.io%2Fdesigning-solidjs-jsx-50ee2b791d4c&source=---header_actions--50ee2b791d4c---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/1*A1mSfCoxdyoM4-vCuIbvyQ.jpeg)*Black and White Carbon Close Up by Engin Akyurt*

[SolidJS](https://github.com/ryansolid/solid) is a high-performance JavaScript UI Library. This article series goes deep into the technology and decisions that went into designing the library. You do not need to understand this content to use Solid. Today’s article focuses on Solid’s JSX templating system.

JSX may not be the most obvious choice for templating in a Reactive UI library, but it definitely brings something to the table that should not be overlooked. It allows increased flexibility, better tooling, and unmatched performance. I consider JSX to be a big part of what makes Solid the fastest reactive library out there. Some have claimed it is something that shouldn’t be matched, but I challenge you, the reader, after reading this article to suggest why would they ever not.

## JSX in a Nutshell

JSX was developed by Facebook as a means to make React’s imperative API declarative. Reacts approach to rendering isn’t unlike a procedure you might find in a video game engine. It just calls the function over and over again to render the screen.

```
React.createElement("div", { id: "main" }, [  "Hi ",  React.createElement("span", {}, [state.name])]);
```