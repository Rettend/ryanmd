---
title: React Hooks: Has React Jumped the Shark?
lastmod: 2019-02-27
source: https://ryansolid.medium.com/react-hooks-has-react-jumped-the-shark-c8cf04e246cf
---

1

Member-only story

# React Hooks: Has React Jumped the Shark?

[![](https://miro.medium.com/v2/resize:fill:32:32/1*eMR1FyWRupD7Ex07HZykGA.jpeg)](/@ryansolid?source=post_page---byline--c8cf04e246cf---------------------------------------)[Ryan Carniato](/@ryansolid?source=post_page---byline--c8cf04e246cf---------------------------------------)Follow11 min read·Feb 28, 2019[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fvote%2Fjs-dojo%2Fc8cf04e246cf&operation=register&redirect=https%3A%2F%2Fmedium.com%2Fjs-dojo%2Freact-hooks-has-react-jumped-the-shark-c8cf04e246cf&user=Ryan+Carniato&userId=1789bbc16f7b&source=---header_actions--c8cf04e246cf---------------------clap_footer------------------)130

3

[](/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2F_%2Fbookmark%2Fp%2Fc8cf04e246cf&operation=register&redirect=https%3A%2F%2Fmedium.com%2Fjs-dojo%2Freact-hooks-has-react-jumped-the-shark-c8cf04e246cf&source=---header_actions--c8cf04e246cf---------------------bookmark_footer------------------)Listen

Share

Press enter or click to view image in full size![](https://miro.medium.com/v2/resize:fit:1000/1*0-SYI9PSvIhTgEnik1mscw.jpeg)*‘Mexico Lake Man Wakeboard’ from pixabay.com*

In a recent [blog post](https://overreacted.io/making-setinterval-declarative-with-react-hooks/) [Dan Abramov](https://medium.com/u/a3a8af6addc1?source=post_page---user_mention--c8cf04e246cf---------------------------------------) claims that React hasn’t jumped the shark with React Hooks. While I agree that Hooks are far from irrelevant and actually offer a better developer experience, I have to pose the question:

Is React trying too hard to be what it’s not?

It’s a similar question to what Dan poses in his [post](https://overreacted.io/making-setinterval-declarative-with-react-hooks/). But instead of focusing on how Hooks provide a more idiomatic approach to programming in React, I want to look at how Hook’s inspiration Fine Grained changed detection hold the key to all the shortcomings of React Hooks. I am going to assume at this point you are at least familiar with React Hooks, and I strongly recommend reading Dan’s aforementioned [post](https://overreacted.io/making-setinterval-declarative-with-react-hooks/) to understand the motivation for this topic. Although if you’ve used React Hook’s yourself you probably have already experienced it.

Ironically, Hooks FAQ has a link to prior art that makes no mention of it, but if you go back to the early 2010’s in the wild west of Front End Javascript, where jQuery was still king, and AngularJS was starting to pick up steam, before anyone outside of Facebook was aware of React, the concept of fine grained changed detection was growing strong. Libraries like KnockoutJS and EmberJS employed an eerily similar pattern in their libraries to manage their state change. If anything it was Reacts introduction of simple POJO like…