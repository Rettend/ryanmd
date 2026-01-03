---
# System prepended metadata

title: Run(Throw) Once Suspense Revisited
lastmod: 2024-12-11
---

# Run(Throw) Once Suspense Revisited

I put this proposal to the side for a while because it was unclear if the added complexity of having multiple behaviors was worth it. It is hard to answer `isPending` when things don't always throw. Separating fallback states from loading seemed cumbersome. So I decided to defer that decision.

However, I recently realized there is another benefit of run once: No need to schedule!

The reason to schedule is to avoid throwing causing diamond problems, but if we run immediately on creation that isn't a problem initially. After the fact there will be the latest value so it won't throw. It is possible for other newly created things to delay second fetch, but comparatively, this becomes a minor and uncommon thing, since dependencies generally are created before the dependent.

This doesn't remove the need of `createAsync` as it needs to run right away which is different than typical memos. But it does suggest autodisposal and offscreen disabling are back on the table. This is significant.

Now there are caveats to both. Autodisposal will refetch on reawakening. Still probably best to use with a cache. Offscreen will always run the createAsync once. Given it always starts onscreen that is probably fine.

## Suspense is independent of throwing

We don't throw and have it today. Nothing stops us from having another means still. We throw to remove the possibility of undefined values. An initial value solves that too.

There are 3 configurations.

```jsx
// probably throws
const todos: Todos[] = createAsync(() => fetchTodos());

// doesn't throw default
const todos: Todos[] = createAsync(() => fetchTodos(), []);

// nullable because deferred
const todos: Todos[] | undefined = createAsync(
    () => enabled() ? fetchTodos() : undefined
)
```

As long as we can propagate asynchronous Suspense doesn't need to care.

How do we do it? We need to propagate async back when pulling values. And clear it the same way at the end. So this should be a matter of just adding additional flag.


## Considerations

If this is unlocked we need to consider what actual Suspense behavior we want? We have only a few constraints.

1. That which throws must Suspend.
2. Detaching UI update from User action erodes trust(visible SWR).
3. Fallbacks when you have content already is jarring.
4. Tearing can be acceptable with adequate affordances.

This leaves design here pretty open. Lazy components don't need to Throw. So they don't need Suspense to work. We might still want to force it. But just working through it, its not necessary.

I think this also suggests at minimum we should Suspend on any newly created Suspense boundary that detects an async pending read, even if the async value has been resolved previously (ie doesn't need to throw). Nothing is quite as jarring as loading a page and seeing old data only to see the new data sweep in moments later. You start anticipating it and it delays your interaction with the page. It would be different if it prompted a user action to update as that puts it in their court, but having things flicker in after the fact on already established content is odd. I do get that with additional loading affordances maybe this is fine.

The problem is I don't know that new Suspense boundaries is adequate here to defend against this. Like if you navigate to a page that causes refetch of data you already have above a new Suspense boundary instead of below you will see exactly what I just described. This is a strong argument for Transactions while navigating or always going to Fallback.

Both #2 and #3 are only possible with Transactions I think. Or very specific route level hoisting and render blocking. Now, to be fair we could do that as that as that is well within our means with Solid router the way it is designed. But it is a bit awkward for streaming to be blocking like that. You can't just block at one place.

As discussed before top-level Transactions are hard to automate because sometimes you want tearing and sometimes that tearing isn't because of a Suspense boundary.

## No Transactions Exercise

Let's pretend Transactions don't exist and we aren't willing to do blocking/hoisted. Then we would be relying on a combination of `Suspense` and `isPending` calls to handle UI updates.

```jsx
function A() {
  const data1 = createAsync(() => fetchData1());
  const data2 = createAsync(() => fetchData2());

  return <>
    <h1>Important Data</h1>
    {isPending(() => data1() || data2()) ? <LoadingSpinner /> : null}
    <div class={isPending(data1) ? "loading" : ""} >{data1()}</div>
    <Suspense fallback="Loading Slow Less Important Data...">
      <div class={isPending(data2) ? "loading" : ""} >{data2()}</div>
    </Suspense>
  </>
}
```

What this would do is Hit a parent Suspense boundary on initial navigation of the page and if possibly show the second fallback (and the loading spinner) if it took longer. On update of either data1 or data2 it wouldn't suspend again but instead show a loading spinner next to the header with their content at a reduced opacity if they were the part that is loading.

If the data1 came from some upper context and it was being refetched due to the navigation like:
```jsx
function A() {
  const data1 = useContext(DataContext);
  const data2 = createAsync(() => fetchData2());

  return <>
    <h1>Important Data</h1>
    {isPending(() => data1() || data2()) ? <LoadingSpinner /> : null}
    <div class={isPending(data1) ? "loading" : ""} >{data1()}</div>
    <Suspense fallback="Loading Slow Less Important Data...">
      <div class={isPending(data2) ? "loading" : ""} >{data2()}</div>
    </Suspense>
  </>
}
```
What you would see is the unseen top level Suspense not triggering but instantly showing the previous version of the data greyed out with a Loading spinner while it waited to come in and be updated.

This isn't bad UX. You can always move the Suspense boundary. It is a bit onerous on DX though. Lots of additional loading checks. That being said if you were to build that UI described you'd need all this. Otherwise you'd find yourself jumping back to fallbacks like crazy which is not what you want. Like it would be brutal here if the whole page went to loading everytime something updated. I can't think of a scenario I'd ever want that to happen here. So are we ok with this?

## Transactions

The one thing you can't do is hold on the previous page. This is a trick that is very common in mobile apps to reduce loading states. The thing is `isPending` as shown can only ask about data in front of it, there is no way to indicate something offscreen is loading and keep track of when that is done. So I think Transactions are still essential but wouldn't stop you from writing your code like above.

What I mean is if the Router is the only thing using a Transaction then you'd listen for `isRouting`. Where you'd use that in the UI is very different than where you'd use `isPending`. It'd be higher up. It'd mask the whole page etc.. It would be interesting if this question could be answered on a per route section level to be fair but that is still the responsibility of the router, not the developer. Like the router could determine which sections would be unmounted and have a signal there come through each page section.

## So What?

I don't know. I don't think this thought experiment yielded much. It is interesting not to have to schedule Async. Simplifies some things. But automatic disposal probably is still too challenged, and if we are still to automate serialization this isn't living outside the ownership tree. But there are some upsides to non-scheduling when doing OffScreen etc.. so I will take it.

I'm not sure it changes my opinion on "Run Once" it feels like that still seems the right balance. It still has all the issues where people don't like it, unless we were only to Suspend when things are thrown. But that doesn't really help with streaming or with having better DX when authoring. You'd still be having to work in your placeholders and while they could double up with your loading indicators its the same problem again. There are 2 classes of pending states(placeholder, auxillary loading affordance) and often you need to mix and match both to have ideal UI.


