---
# System prepended metadata

title: What if we had AsyncContext?
lastmod: 2025-07-24
---

# What if we had AsyncContext?

I know I've been a big proponent of keeping tracking on the synchronous side of things. This is mostly because you want to hoist out the expensive async stuff anyway. Like, pretend you are grabbing the most liked comment off a users favorite post. If you have a sequence like:

```js
const user = await fetchUser(props.id);
const post = await fetchPost(user.favoritePostId);
const comments = await fetchComments(post.id);
let found;
comments.forEach(comment => {
  if (!found || comment.likedCount > found.likedCount)
      found = comment; 
});
return found;
```
It would be terrible to refetch everything just because the likedCount changed. I know above isn't reactive but conceptually you want to break apart that process. User, Post, even Comments probably should all be seperated from finding the most liked. As you can see it's basically right along the `await` boundary.

Now how different is this if it looked like:
```js
const user = await userPromise;
const post = await favoritePostPromise;
const comments = await favoritePostCommentsPromise;
let found;
comments.forEach(comment => {
  if (!found || comment.likedCount > found.likedCount)
      found = comment; 
});
return found;
```
Now yes the consequence is something that arguably be synchronous after resolution is always going to be async but you aren't doing a bunch of extra work. The promise is essentially cached.

Don't get me wrong because Signals can resolve synchronously this is infinitely better:
```js
const user = createAsync(() => fetchUser(props.id));
const post = createAsync(() => fetchPost(user().favoritePostId));
const comments = createAsync(() =>  fetchComments(post().id));
createMemo(() => {
  let found;
  comments().forEach(comment => {
    if (!found || comment.likedCount > found.likedCount)
      found = comment; 
  });
  return found;
});
```
In this case even if the aboved multiple async resources being read in a single computation it will all run as expected. However, with our throwing mechanism you can end up with:
```js
createMemo(() => {
  // expensive calculation
  readSignal1();
  // expensive calculation
  readSignal2();
  // expensive calculation
  readSignal3();
})
```
If those signals were async there is chance that the first couple expensive calculations re-run. Yes there are no side effects so from a correctness standpoint there is no problem (which we can't say about `createEffect` hence why it is split). But we always restart.

## Exploring Continuations

Now in JavaScript there are only 2 forms of continuations. Generators and Async/Await. Unfortunately with Async/Await we can't re-insert our tracking context. So you have to use generators or we have to wait for Async Context to arrive.

Well, not exactly. There is a 3rd option. Which is manually pass in the tracking function.

```js
createAsync(async (get) => {
  const res1 = await asyncOp(get(signal1));
  const res2 = await asyncOp(get(signal2));
  const res3 = await asyncOp(get(signal3));
})
```
In this way you can track after await.. Except, sure that's fine in `createAsync` maybe now you need to add it to `createMemo`.. `createEffect` pretty much everywhere.

How do we get that into the JSX? A global `get` can't resolve async any better than our function callbacks. It needs to come from the parent context.

More over you need to be able to support async functions and promises everywhere. It sort of becomes this coloration issue. And TypeScript isn't going to be our friend. If you put `await` inside a JSX expression it will want your whole component to be an async function.

While this is a solution right now I don't think it will ever be the ideal one. Firstly where this matters is the minimal case. If you force coloration on everyone everything will just be chain of promises.. people will resolve high just to avoid this mess. Secondly, when other solutions appear this will look overtly complicated. Yes Jotai has this API. People aren't passing Jotai atoms through their props and through the heirarchical trees. It is acceptable there but I think it would be very challenged as core state management in a UI framework.

## Better Solution

So what can we do if we want to give people this super power in the future without completely butchering their code?

What if you throw by default on access but Signals are also `thenable`. Ie.. you can await them. They are both Promises and Signals. Now most of the time you wouldn't, but at some future time when AsyncContext arrives we add the feature to able to let pure computations take Async Functions and have continuation. Since all computations need to be able to handle async anyway in 2.0 it isn't that far of a stretch that when the time is right we give this power.

That way when AsyncContext lands and people find work that just needs to be sequential we let them. To be fair we could probably do this with generators today but I have some reservations. Mostly I haven't thought through this too hard. And I think with AsyncContext we can do this almost automatically.

The catch of course is random think `() => value` isn't going to be `thenable` so in some cases if you want to await an arbitrary expression maybe some props you might need to pass it into our `resolve` helper (which is already coming in 2.0). What this does is turn any reactive expression into a promise.. and it could shortcut if the input is already `thenable`. Just using that built in mechanism.

So what I'm saying is:
```js
const user = createAsync(() => fetchUser(props.id));
const user2 = createAsync(() => fetchUser(props.otherId));
                                         
                                         
const value = createMemo(async () => {
  // direct
  const resolveUser = await user;
  // indirect
  const userName = await resolve(() => user2().name);
})
```
But of course you could always just do this knowing the function might run twice:
```js                        
const value = createMemo(() => {
  const resolveUser = user();
  const userName = user2().name;
})
```

## Conclusion

This was just a quick thought but I think if we were ever concerned with giving this power this is the way to go. Mostly that we don't have to force promises everywhere especially in things like JSX which aren't going to have that sequential problem. And we give users the ability to do stuff if they really want to. Of course the performance could just really suck with `AsyncContext` and using `await` anyway and this isn't worth doing. But it feels more inline with what we are going for.