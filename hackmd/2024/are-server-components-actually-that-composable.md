---
# System prepended metadata

title: Are Server Components Actually That Composable?
lastmod: 2024-02-12
---

# Are Server Components Actually That Composable?

A common argument for Server Components is that they are composable, but I often wonder how true that is. The ability to embed Server Components inside other Server Components and thus fetch all the data in a single flight is attractive, but as far as I can see that isn't without consequence.

## 1. Server Waterfalls are Real

I don't know who needs to hear this. Maybe repeat it out loud until it sinks in.

Look at the work on solving "N+1" problems in GraphQL. That is when you are fetching a list of users, that each has a list of friends, that each has a list of friends, and so on... Before I was working on SolidJS I did a lot of work on an ORM. It was GraphQL-esque in a time before GraphQL. I did a lot of my work in automating the optimization of cross-model queries from knowledge of the Database schema and query analysis. I can be accused of maybe micro-optimizing but it is a real thing.

I wouldn't expect Server Components to solve the "N+1" problem on their own. Deduping caches help with repeat requests but not where you are making multiple requests where you could group them into one. But it is something you need to be aware of at design time.

Edge functions are a prime example of where "server" waterfalls can have a bigger impact. We rely on a lot on streaming there, but latency is still a consideration. We've seen solutions like Next 14's Partial Pre-Rendering which would have minimal impact if it were not for the desire to bring the web server closer to the database to reduce the impact of Server Waterfalls.

RSCs do some work in parallelizing the flow, but hierarchically they [waterfall](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#parallel-and-sequential-data-fetching). It's obvious looking at the code. `async/await` is blocking. You call `await`, nothing after that line in the function scope is being called until it resolves. You can `Promise.all` to do some level of parallelization, but still parent over child.

Some waterfalls are unavoidable. You need to check if someone is logged in before you fetch something. You need to get some other data before other data. However, component organization is based on the view hierarchy rather than the data hierarchy. It's a layout consideration. We could have all the data we need to fetch children before the parent fetch has returned but we don't show them yet because we don't show certain elements without others.

Ultimately we end up in the same place as without RSCs, [route level hoisting](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#preloading-data).

So it's clear that server waterfalls are real. But does that impact composition? Well not necessarily. You can export preload functions from all your components and people can choose to use them or not. You could do that without RSCs as well. The one thing you wouldn't do without RSCs is not export those preload functions, but you could do that here.

Should you?

## 2. A UI Tree is a Merged Tree

This is after all the big win of React. No separation of concerns. But it means that when part of it loads/updates you end up re-rendering the whole thing. If you have 5 data sources to render a page, you will load all 5 of those data sources to realize that view.

In the browser, we don't think about this much as Components also give us node-level granularity. You can start this process again from any component. You might not need to refetch that data, as it is stored above.

But Server Components are a single tree. Yes with nested routing you can have a few trees, but for any page section, you are in one tree. For any mutation, navigation you need to do the whole thing. That's one of the strengths. It's a single flight and ensures everything is there. But let's look at what that means for your data.

Well, the first obvious one is you are going to rely a lot more on server caches. Deduping is something that React can provide itself but if you want something to last across requests which seems prudent given that every time you hit the RSC endpoint you are fetching everything, well now you need your data fetching to be cache-aware. So how do you compose that for your would-be Component consumers?

A reusable server component would need to participate in the cache system. It would need to know that you are using Vercel's Blob storage, and it would need to know how it was configured. But you wouldn't want it to have a dependency on a specific platform (Vercel) or a specific framework (Next) otherwise it wouldn't be reusable.

You could use something like Context to make it so a generic `cache` call from React itself could have extended capability. That's probably the way this goes eventually. You could also not participate in the `cache` mechanism but then you couldn't wrap your calls inside your server components with it.

Interestingly if you were just exporting the functions that did the data fetching without Server Component consideration the end user could always wrap them before calling them. But since Server Components abstract the call site you now need other ways to inject this.

## 3. Platform Details Always Leak

As much as we are trying to standardize. As much as there are things like WinterCG, every platform is different. And one of the trickiest parts of those differences comes right down to how to handle the core Request/Response.

How do you set Headers or change the Status Code? How do you handle specific environmental considerations? Every platform has its own Request Event format.

To be fair, one could choose a standard format like the Web Request and Response objects to model the API and if that were built into React itself everyone could leverage it. I imagine we see more work in this direction as it benefits every React user. But there are always differences in the platforms. There are even differences between frameworks.

This (and the previous section) is why services, like an auth service like [Clerk](https://clerk.com/) for example, will create components per Metaframework instead of just a single React one. And I could picture the challenges that would come with framework/platform combinations. This isn't a new problem that RSCs introduce, but it also isn't one we are quite solving yet, if ever.

## 4. Data Flow is a Two Way Street

Mutations are naturally part of any system. If you own the root of rendering you need a way to close the loop with updated data. So how do we do this with Server Components?

Well, there are 2 pieces. We need to navigate to the next page (or reload the current one), and we need to invalidate any caches. This means that mutations are generally router and possibly cache-aware. You might import a `redirect` from `'next/navigation'` or a `revalidateTag` from `'next/cache'`.

Again this could be generalized through some React mechanisms as long as the specific behavior was achievable.

But I think it more speaks to the fact that mutations generally aren't that composable. You can't tell the app where to navigate without knowing where your reusable component is going to be used. You might not know all the data that needs to be invalidated as the re-usable server component author.

You are probably better off exposing a function that does the mutation and allows the end user to decide the cache and routing behavior by calling it.

## Conclusion

This isn't all to say React Server Components aren't a good solution even if I question the overall composability. I asked a while ago on Twitter for good examples of Server Component libraries and they were all things that didn't matter that they were. The person could have just exposed a function for data loading.

The reason being is that the real win in composability is probably in the "shared components". We don't talk about this much anymore. But the fact that you can author components, which can be used Server or Client side and they inherit the characteristics of their parents. Unless people are shipping pre-made templates/layouts this will probably be something that stays in your teams rather than on NPM. But that's OK.

Server Components aren't supposed to solve everything, but give us a different way to express the solution. And with careful consideration like any approach you can build great ones.

