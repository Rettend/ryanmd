---
# System prepended metadata

title: Nature of Async
lastmod: 2024-12-11
---

# Nature of Async

## Lazy Async Causes Waterfalls

```jsx
const [userId, setUserId] = createSignal(1);

const user = createAsync(() => fetchUser(userId()));
const userDetails = createAsync(() => fetchUserDetails(userId()));

createEffect(() => [user(), userDetails()], console.log);
```
Or:
<pre>
  A
 / \
B   C
 \ /
  D
</pre>

If `B` and `C` is are async and lazy and only read in the effect.. what would happen is it would read `user` and start fetching and then throw. `userDetails` wouldn't read and fetch until after `user` resolved.

You could guard to prevent this problem:
```jsx
createEffect(() => {
    const userPending = isPending(user);
    const detailsPending = isPending(userDetails);
    
    return !userPending && !detailsPending ? [user(), userDetails()] : [],
  }, console.log
);
```
In this case each throw would get caught by the `isPending` and in so each fetch would happen. But that doesn't get us much.

Non-throwing approaches to Async don't necessarily have this issue but might require guards anyway if they want to avoid `undefined`.

```jsx
createEffect(() => {
  const u = user();
  const d = userDetail();
  u && d ? [u, d] : [],
},   console.log
});
```

Even if you initially fire off the requests the first time, updates will have this same problem unless you opt into tearing (keeping old state while new async is in flight) or schedule the fetching.

Let's look at the first option:

## Async Tearing is Wasteful

I've been exploring Run Once Resources/Suspense for a while but I realize that it is fundamentally flawed.

Consider:
```jsx
const [userId, setUserId] = createSignal(1);

const user = createAsync(() => fetchUser(userId()));

const bestFriendship = createAsync(() => fetchFriendship(userId(), user().bestFriendId));
```
Or as a graph:
<pre>
   A
  /|
 B |
  \|
   C
</pre>
B and C are async. This is an unavoidable waterfall. However, run once not throwing is detrimental here.

When `A` is updated and it notifies `B` and `C` both get queued to run. `B` runs fetching the new user. Then `C` runs, it sees the existing `user` but the new `userId` and it fetches the friendship information for that combination. When `B` completes `C` is notified again and fetches the relationship now with the correct Ids.

Tearing we accepted for UI but for data fetching is terrible. It's possible to guard this. Usually we'd null check but `isPending` could be used similarly to remove the intermediate fetch. But it is unexpected default I think.

```jsx
const bestFriendship = createAsync(prev => { 
  if (!isPending(() => user().bestFriendId)
    return fetchFrienship(userId(), user().bestFriendId)
  return prev;                            
});
```

Solid today actually like this to be fair but because chaining resources comes up so rarely we don't hit this. If we nulled out values while fetching we wouldn't have this problem but we'd also have some pretty blotchy UI unless we said Suspense was necessary. Even Transactions/Transitions would be subject to this because when working on that alternative reality Async still isn't instant so there is no real guard except the one we enforce or the one the developer needs to put in themselves.

Which brings me to:

## Suspense is Necessary

Making it optional doesn't really work if you want to not tear. Tearing can be unpredictable. It isn't just like part of the UI isn't inserted. It could be missing classes on rendered elements or other oddities.

Now not everyone wants to use Suspense but they essentially recreate it/or Transactions in their attempts to not use it. You put placeholders in your UI, or you leave the current data in place and place loading guards around downstream calculations.

The biggest opposition to Suspense is that it is jarring when things under it cause it to fallback. The answer is usually to go more granular but if you want to default values it is a bit awkward because you can do that at a single point high up without upheaving everything below, whereas Suspense being granular would need to push pretty far down.

You can opt out of Suspense with guards:

```jsx
const localUsers = () => isPending(users) ? [] : users();
```
We could even look at way to resolve the last resolved value:

```jsx
const localUsers = () => latest(users);
```

## `latest`/`resolveSync`

Although that could only be resolved shallowly. We can't stop a dependency from throwing in the first place but we can instrument the read. And we can't guarentee that it doesn't throw.

```jsx
const user = createAsync(() => fetchUser(props.id));

const firstName = createMemo(() => user().firstName);

const firstLetter = () => latest(() => firstName()[0].toUpperCase());
```

Initial there is not value so `latest` at minimum needs to `try/catch` and recognize that regardless of the error it is `undefined`. In this case it will read `firstName` under latest mode and just return `undefined`. Which then will throw can't read property "0" of "undefined" and the latest helper will just swallow that error and return `undefined`.  `latest` always return `T` or `undefined` so this fits.

Now lets assume it resolved to "John" the first time. But now we go to fetch user again and something else causes us to look at `firstLetter`. When it goes to read latest again even though `firstName` should throw it is in latest mode and will return the last value `"John"` which will allow us to get `"J"` safely.

One thing worth noting is if the Memo or Async has a default value then `latest` would be able to always resolve out a value. Part of me wonders for that reason if the helper itself should take a default value. Then again you could always `||` a value on to it.

```jsx
const user = createAsync(() => fetchUser(props.id));

const firstName = createMemo(() => user().firstName, 'Default');

// Always `D` or something else
const firstLetter = () => latest(() => firstName()[0].toUpperCase());
```

`latest` might not be the right name because in reality while it uses the latest value if something in the future would cause it to fail out we don't get the `latest` value.. we get `undefined`. So it's more like trycatch with a special mode switch that tries its best to resolve a value synchronously.

Like a `resolveSync` maybe. It doesn't force it to resolve synchronously though. More like a try to resolve synchronously. Maybe `latest` just reads better.

## Current Thoughts

Run Once doesn't work. There is no way to avoid scheduling. We need to always throw (or force `undefined`) so we always need Suspense. We can have better Dev tooling around it but it is what it is. Guards can be helpful like `isPending` or `latest` if we really don't want to Suspend in places but fundamentally if you don't want the fallback to happen for data that you did Suspend initially we don't have much recourse except to perform Transactions or for the developer to do the old `latest(user) || user()`. That just isn't a default the system can take when propagating change through the graph.




