---
# System prepended metadata

title: Consistency Revisited
lastmod: 2025-07-23
---

# Consistency Revisited

I posted this example a long time ago:
https://x.com/ryancarniato/status/1353801009844240389

Even wrote an article about it:
https://dev.to/this-is-learning/the-cost-of-consistency-in-ui-frameworks-4agi

But I want to explore this again because regardless of the means of your reactive state it is all basically the same considerations.



| What's Deferred?     | Write           | Notification | Effects         | Nothing       |
| -------------------- | --------------- | ------------ | --------------- | ------------- |
| Biggest Benefit      | Consistent      | Efficient    | Incremental     | Feels natural |
| Largest Downside     | Feels unnatural | Inconsistent | Not Synchronous | Wasteful      |
| State/Derived/Effect | 0/0/0           | 1/0/0        | 1/1/0           | 1/1/1         |
| 0 -> 1 -> 0 Runs?    | No              | No           | Once            | Twice         |
| Consistent           | Yes             | No           | Internally      | Yes           |
| Incremental          | No              | No           | Yes             | Yes           |
| Example              | React           | Svelte 3     | Vue             | Solid         |
