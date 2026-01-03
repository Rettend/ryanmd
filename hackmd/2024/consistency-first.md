---
# System prepended metadata

title: Consistency First?
lastmod: 2024-06-25
---

# Consistency First?

Towards the end of my last brain dump I asked the question what if there was no Suspense. I discounted a consistency first model there perhaps too immaturely. The challenge is with a throw based model the tearing is no longer predictable. I focused so much on effect grouping in the last write up because that is what gets blocked. So we need to really exhaust this before making a decision.

## Consistency First

### Three Modes on Initial Render

Let's start with something simple:

```jsx
function Post(props) {
  const post = createAsync(() => getPost(props.id))

  return <>
    <Nav selected={props.id} />
    <h1>{post().title}</h1>
    <p>{post().body}</p>
  </>
}
```

If we were consistent by default upon rendering this page we would show nothing until the post is available. This works and is consistent but perhaps not what is expected since there will be a visible delay.

Now we could show the `<Nav />` right away and a loading state simply by wrapping `<For>` in `<Suspense>`.

```jsx
function Post(props) {
  const post = createAsync(() => getPost(props.id))

  return <>
    <Nav selected={props.id} />
    <Suspense fallback="Loading Post...">
      <h1>{post().title}</h1>
      <p>{post().body}</p>
    </Suspense>
  </>
}
```
This would work exactly how you would expect via Placeholder.

The other way to show the `<Nav>` right away would be opting into tearing.

```jsx
function Post(props) {
  const post = createAsync(() => getPost(props.id))

  return <>
    <Nav selected={props.id} />
    <h1>{latest(post)?.title}</h1>
    <p>{latest(post)?.body}</p>
  </>
}
```

Here I had to do 2 things. I needed to wrap posts in a `latest` wrapper so it doesn't throw and I needed to provide a null check. Which is interesting because from a TS perspective `post` is non-nullable in this consistent first model.

Alternatively we could set a default value:
```jsx
function PostRoute(props) {
  const post = createAsync(() => getPost(props.id), {})

  return <>
    <Nav selected={props.id} />
    <h1>{latest(post).title}</h1>
    <p>{latest(post).body}</p>
  </>
}
```
But it does ask the question with the possibility of reading `latest` should createAsync always ensure a default value for TS sake.

Of course you can use tearing in simple examples to implement a placeholder and I imagine most people would. You would implement it like this using narrowed `<Show>`:


```jsx
function PostRoute(props) {
  const post = createAsync(() => getPost(props.id))

  return <>
    <Nav selected={props.id} />
    <Show
      when={latest(post)}
      fallback="Loading Post..."
    >{
      post => <>
        <h1>{post().title}</h1>
        <p>{post().body}</p>
      </>
    }</Show>   
  </>
}
```

So there we have it Consistent, Placeholder, and Tearing.

### Three Modes on Update

Taking our same example we just need to picture what happens with `props.id` changes. While I didn't focus on it much above because it didn't matter for initial render, we should note that we pass the `props.id` to the `<Nav>` to show the current selection. This will be important for this part of the example.

In our purely consistent model nothing would update until the next post finishes loading. 

```jsx
function Post(props) {
  const post = createAsync(() => getPost(props.id))

  return <>
    <Nav selected={props.id} />
    <h1>{post().title}</h1>
    <p>{post().body}</p>
  </>
}
```

Each of the `<h1>` and `<p>` would be notified of the `post` possible change and they would hold effects until the new `post` is available. This also means that the `<Nav>` would not be able to render an updated version of itself with the new `id` until the newest `post` is available.

Our Suspense solution would drop back to fallback so we'd see "Loading Post..." from when the `id` changed until the new data was available, but we'd see the `<Nav>` render update right away.

```jsx
function Post(props) {
  const post = createAsync(() => getPost(props.id))

  return <>
    <Nav selected={props.id} />
    <Suspense fallback="Loading Post...">
      <h1>{post().title}</h1>
      <p>{post().body}</p>
    </Suspense>
  </>
}
```

And our tearing solution would see the updated id in the `<Nav />` but show the previous value of `post` until the new value is available.

```jsx
function PostRoute(props) {
  const post = createAsync(() => getPost(props.id), {})

  return <>
    <Nav selected={props.id} />
    <h1>{latest(post).title}</h1>
    <p>{latest(post).body}</p>
  </>
}
```

### Thoughts so Far

Suspense in these scenarios works well and as expected. Tearing takes more work but not significantly so.

#### `latest` API considerations

Trickiest part is how to make the Types behave well for both scenarios. `latest` can be nullable if no default value is provided. But we may not always have a direct wrapper that can infer what the default value is or whether it exists. We might just have to force nullable-ness into it. Like make always `| undefined` since `latest` could wrap not just the async signal directly but a whole expression. It could be untrue that the value could ever be `undefined` but we would have trouble knowing that from the generic helper. Especially if it is a mode switch essentially.

Consider:
```js
const multiplied = () => latest(() => asyncCount() * syncMultiplier())
```
If we allowed `asyncCount` to throw here the latest value couldn't represent the multiplication. In so the only way I could see to make TS behave properly is enforce a default value. It might never get hit in normal execution but then `asyncCount` would never lie.

```jsx
// this could be undefined
const asyncCount = createAsync(() => fetchCount()); 

// this will always be a number even if initially `0`
// and you will probably never see it
const asyncCount = createAsync(() => fetchCount(), 0); 
```

This removes alot of the really cool magic I was going for with `createAsync` being non-nullable but it would satisfy TS.

The other option is make `.latest` dangling like we do today:

```js
const multiplied = () => asyncCount.latest * syncMultiplier())
```

This drastically reduces the portability of async but it forces the choice. If a component doesn't accept a nullable prop the consumer must either call the async signal directly (which is non-nullable) or they must use latest and provide a default value.

```jsx
// both of these acceptable
<Post post={post()} />

<Post post={post.latest || { title: "", body: ""}} />
```

#### Locking Consistency

The trickiest part with this model is if you do the naive thing there is no way to show loading indicators. There is no way to update part of the screen when something async is hit outside of purposeful tearing or Suspense.

The alternative is introducing Transactions. Let's explore that.


### Implicit Transactions

But the key to those would be having some way to see the state of them. Ie.. are they pending? So implicit Transactions are hard I think.

Like if every setter could cause a transaction how would you determine if it is was pending. And how would you show it? The signal that determines that state would have to live outside of the Transaction itself or it would be locked. Any state set could tie into a Transaction.

One way would to expose another Signal from each Signal setter. But it seems awkward?

```js
const [count, setCount, isPending] = createSignal(0);

// or maybe???
const [count, setCount] = createSignal(0)
setCount.isPending()
```

It's important to understand that Transactions aren't an opt out on Read thing completely because things like `latest` help you see the past, they aren't tools to look into the future.

React has this position that new Suspense Boundaries created under a Transition don't get added to the Transaction and instead go to fallback. But this could never help with things already on the page. They need to stay in the past.

There is also the "Typeahead" problem. Where you have an input and a search and don't want the input to get locked in its state by the search. Generally you keep 2 states and have one be set as part of the Transaction and the other not.

Ultimately Implicit Transactions would probably still mean having explicit opt out. If we were to be implicit we'd need some sort of way to key into the Transaction state and that seems like it would be our blocker unless handled in a global way.

Where explicit you simply do:
```jsx
const [isPending, start] = useTransaction()

start(() => setCount(1));
```

## Inconsistency First?

So where does this leave us. If Transactions are opt in, consistency means locking things up. Do we still feel this is a good default?

What are the options?

1. We lock up all the effects like proposed basically treating the top level app as if it were in Suspense of sorts. This aligns with idealized server rendering probably.

2. We do inconsistent tearing based on how effects are grouped. We expect people to use the tools provided to get the experience they want.

3. We default to `.latest` instead of throwing and we bring back the null checks, but tearing happens predictably.

To be fair we probably need to explore the 3rd option more to understand if it is viable. The first is what we've been exploring so far, and the second is basically what would happen in a throwing async system if we did nothing.

### Opt-In Throwing?

So instead of `latest` you would have `wait` and if you set wait it would throw and then resume when it came back. To be fair at a shallow level this isn't really any different than a null check. 

How about deeper? Well if you `wait` something and then something above it reads it I guess it will just get the previous value. I guess really opt in throwing is just a fancy syntax for null checking. And if you try to `wait` the thing above then yes you can throw there too but who cares.

The reason you'd throw is to remove coloration. So either you do it or you don't. Adding a syntax while not really coloration, is no better than just null checking. If you are going to null check anyway we should abandon throwing.

I guess the other consideration of defaulting to the `latest` is would things suspend. Like would the reason you use `wait` be specifically to trigger Suspense and going any other way wouldn't? That's interesting. People would generally make the `wait` decision where data left the components even if it a downstream Suspense boundary that may catch it. Lazy evaluation would still allow this.

I guess our stance to date has been if you have async data you didn't want to Suspend you can avoid the whole thing by using `createEffect` writing a Signal. That is still true here. Perhaps it is still good we are a bit more prescriptive with `createAsync`.

## Conclusion

Well maybe we've eliminated some options. Unless we want to give up on colorless Async we are going to go with throwing by default. Which means that top level will never tear predictably. So we really have to think hard whether we want to freeze or accept it top level.

Freezing top-level is a lot nicer if we have implicit Transactions as consistency first wouldn't have to block the universe. However without an API to track the state of particular Transactions it is pretty difficult. The linking has to be on the write side and we can't just inject signals into the graph they need to already be there before the right. This could be an option worth exploring but seems awkward.

So if we aren't implicitly Transacting how do we feel about freezing top-level? Most people should be using the tools but if they don't they will find themselves unexpectedly waiting for stuff. They will think their app is slow. We see this all the time with the Router when people don't realize there is a Transaction under the hood. I don't think it is intuitive at the moment. However having unpredictable tearing due to effect grouping is hardly better.

I can see people trying to work around either behavior. Atleast with the freezing they have control by using `latest`. I see this on the router all the time where people start using `.latest` to cheat out of Suspense. With arbitrary tearing they would probably need to move stuff into different Components for no really explainable reason other than.. hey you should use Suspense.

If all roads lead to the same place and freezing is more instructional maybe its the better choice. Or maybe I should spend some more time thinking on implicit Transactions. 

In either case it does feel like the solutions aligning. Either we leave things Solid 1.0 style and null check, or we take it quite a bit down this path.