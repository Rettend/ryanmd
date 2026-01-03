---
title: eBay Launches Marko 5
lastmod: 2021-02-10
source: https://ryansolid.medium.com/ebay-launches-marko-5-2e0fe06280c
---

# eBay Launches Marko 5

## eBay’s open source JavaScript UI framework modernizes universal web development.

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/@ryansolid?source=post_page---byline--2e0fe06280c---------------------------------------)[Ryan Carniato](/@ryansolid?source=post_page---byline--2e0fe06280c---------------------------------------)Follow3 min read·Feb 11, 2021[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Febaytech%2F2e0fe06280c&operation=register&redirect=https%3A%2F%2Fmedium.com%2Febaytech%2Febay-launches-marko-5-2e0fe06280c&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--2e0fe06280c---------------------clap_footer------------------)154

[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2F2e0fe06280c&operation=register&redirect=https%3A%2F%2Fmedium.com%2Febaytech%2Febay-launches-marko-5-2e0fe06280c&source=---header_actions--2e0fe06280c---------------------bookmark_footer------------------)Listen

Share

By: [Ryan Carniato](/@ryansolid), [Michael Rawlings](/@mlrawlings) and [Dylan Piercey](/@dylanpiercey)

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:700/0*aDHDWqqSJ5arSCbz.jpg)
eBay was founded with the core belief that we should use technology to empower and connect people globally. In the technology world, we’re a core contributor to and believer in open source technology. Not only does a company culture of open source help us empower our developers, but it also enables our technologists to collaborate both across the organization and with peers throughout the industry.

A key pillar of eBay’s participation in the open source software community is our most popular open source project, [Marko](https://markojs.com/). Initially developed by eBay in 2012 to transition from our Java stack to a Node stack, it now powers the majority of [ebay.com](https://www.ebay.com/). While Marko was transitioned to the [OpenJS Foundation](https://openjsf.org/projects/), eBay still actively maintains the project.

[Marko](https://markojs.com/) is a JavaScript framework for building universal websites: You write your code once, and it works seamlessly across both the server and the browser. Where Marko stands out is its incredible [server rendering performance](https://github.com/marko-js/isomorphic-ui-benchmarks), and smart compilation to generate the optimal code for both the server and the browser. This has been vital to reaching our performance goals for the eBay platform, and is the culmination of years of battle-tested experience at a global scale.

Since Marko’s last major release in 2017, the modern web has evolved at breakneck speeds. The JavaScript ecosystem has boomed, and tooling has grown in capability. And so Marko has changed with it. With recent focus returning to server rendering and server components — topics core to its DNA — Marko already delivers on next generation features.

Instead, Marko 5 focuses on improving the developer experience by providing a foundation built on modern JavaScript tools, a better integration story with third-party libraries, and an easier path to getting started.

## New Compiler

The Marko 5 compiler now runs on [Babel](https://babeljs.io/). This means immediate support for all current and future JavaScript language syntax and features by leveraging their huge ecosystem of presets and plugins.

## Get Ryan Carniato’s stories in your inbox

Join Medium for free to get updates from this writer.

SubscribeSubscribeThis also brings easy interop with the modern JavaScript ecosystem. We’ve updated our third-party integrations and added a few new ones:

- Bundlers: You can now build your Marko projects with [Webpack](https://github.com/marko-js/webpack) or [Rollup](https://github.com/marko-js/rollup), in addition to eBay’s [Lasso](https://github.com/lasso-js/lasso-marko).
- Testing: Marko fully integrates with [Jest](https://github.com/marko-js/jest) and [Storybook](https://github.com/storybookjs/storybook/tree/master/app/marko). Test with confidence with the [Marko Testing Library](https://github.com/marko-js/testing-library).
- IDE: Marko’s language server integrates seamlessly in VSCode, bringing powerful code completion and navigation; syntax highlighting; and real-time error messages.

We will continue to work to incorporate support for tools like TypeScript, Prettier and ESLint.

## Improved CLI

Getting started with Marko has never been easier. The Marko CLI generates a ready-to-go project with built-in routing. Simply adding your pages and components to the folder generates a universal server and browser application. And that’s it. Marko automatically detects your components so you can use them without importing.

These CLI projects come with the best practices for performance built in. Marko automatically detects the components that are only needed on the server and produces an optimal browser bundle for you. Asynchronous streaming lets your pages arrive in the browser as quickly as possible while the rest of the data loads. We’ve been leveraging these techniques for over half a decade at eBay in production and now you can, too([read more here](/@mlrawlings/maybe-you-dont-need-that-spa-f2c659bc7fec)).

To get started, simply run the command from your terminal and follow the interactive CLI.

npx @marko/create## That’s Just the Start

Marko is a powerful, markup-based language that embraces the complexity of the client while being as easy to write as HTML templates. Our new compiler is designed to be able to target other platforms or even other UI frameworks. We have already begun to leverage it in developing our [next-generation reactive runtime](/swlh/fluurt-re-inventing-marko-db265f07cc45).

It’s never been a better time to give Marko a try. You can find the new version on our [GitHub](https://github.com/marko-js/marko) and our updated documents at [www.markojs.com](http://www.markojs.com./). See for yourself what it is like to use the JavaScript framework built from the ground up with both the server and the browser in mind.

Originally published at [https://tech.ebayinc.com](https://tech.ebayinc.com/engineering/ebay-launches-marko-5/) on February 11, 2021.