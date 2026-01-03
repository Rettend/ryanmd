---
# System prepended metadata

title: SolidStart Beta 2 Data Fetch Plan
lastmod: 2023-11-05
---

# Deciding Start/Router Plan

As I see it we have a few options in how to proceed the next few weeks with Start Beta 2.

Here are the facts:

1. I have a good plan on how future APIs should work in Solid 2.0. But 2.0 is still a while away and we need to get SolidStart out. However, these APIs are hard to approximate perfectly in 1.0 for hydration.
2. Future Server Components dictate we change loading patterns towards towards `cache` over `loader` this suggests replacing `data` functions with `preload`.  Also towards lower case `<a>` and `<form>`. This means it seems very likely if we don't go all the way on refactor now we will have to some time in the next year.
3. All that is absolutely required for the Router for SolidStart Beta2 is a very small change to how we inject the URL/handle redirects so that we can pull it out of Start.

For reference this is how I picture the Route API in the future: https://hackmd.io/3RmeLfvZQ9apzAsiYclFPQ 

## Options

### 1. Do the minimal amount for SolidStart Beta2 knowing that we are going to break everything in the future.

This means leave the Data APIs in Start, update to `action` but not to `cache`. Keep `createRouteData`.

**Pros:** The only work here that needs to be done is really on actions. This is significantly less work than other options if only consider Solid Router.
**Cons:** Every part of the data fetching story is going to change in the future. But we'd probably push it off to Solid 2.0. So we'd release knowing that were going to break the router data fetching. Also some features might be SolidRouter only at first.
**Other:** Since we are decoupling the Router from Start a bit here the migration for people could come at their own pace when do change the data fetching as they could stay on old versions of the router.

### 2. We try our best to approximate the future APIs and release them through the Router package.

This requires a specialized `createAsync` that is sort of a hack and will only work as specifically directed in conjunction with `cache` APIs. We update the Router to use `preload` and basically break everything now.

**Pros:** It will be one big change now and we won't have to worry about this later other than updating some imports.
**Cons:** Definitely will be a lot more work, mostly in that the complexity and code size to hack around the current solution wouldn't be needed in 2.0


### 3. We prototype `createAsync` in Solid 1.9

Similar to the last option except we try to do `createAsync` properly from an API standpoint but not from a behavior standpoint. We introduce it as experimental but then re-export it somewhere(Start/Router) for people to use it.

**Pros:** It will be less of a hack and won't have to worry about it later. And it will be less wasted work.
**Cons:** This option probably would slow us down the most and be the most work overall. It still won't be proper. `createAsync` which might dull its thunder when it comes for real.
