---
# System prepended metadata

title: Run-Once Suspense (Version 2)
lastmod: 2025-02-09
---

# Run-Once Suspense (Version 2)

> EDIT: July 23rd 2024... Since writing this I realize that unpredictable  tearing by default on creation is probably a non-starter. It is just too unpredictable. It isn't just missing elements.. it could be missing styles etc.. it would be chaos. So I consider this version of the proposal defunct.

While a lot of the ideas I've been proposing seem pretty powerful there is definitely some complications and reasons for resistance. Truthfully they already exist in current models, but perhaps this is our chance to do something about it. So I have a fairly radical idea from an academic standpoint, but possibly the right tradeoff from the practical sense. So I'm going to explore it here.

### Goals

1. Provide a colorless (non-nullable) async model.
2. Restore confidence in using Suspense by leaving more control in the developers hands.
3. Have a model that is consistent across SSR and client updates

### Sub-Goals

1. Have the default behavior still be reasonable for people unaware of these features.
2. Remove the need for `latest` style APIs and the challenges that come from introducing back in nullable async.

## Concept

Instead of seeking consistency in all things we default to tearing and have other behavior be opt in.

While an odd position to take as someone seeking consistency, some conversations with Dan Abramov a year or so back were pretty illuminating to me but I didn't really actualize it until now. He told me while Transitions were good he expected most developers to opt into tearing to escape Suspense. This is interesting because async tearing is the default for frameworks, but now with Suspense you needed to jump through hoops like `useDeferredValue` in React or `.latest` in Solid.

We have to consider the whole impetus behind the Transition API is that once you have loaded content you rarely want to go back to fallback. And yet it is what happens naturally the second you update data as soon as you add Suspense. It is simple experience for the naive API but in real apps it is pretty clear that people pretty much never want stuff being ripped out from under them on an update.

A small but important development was a later change I believe Ricky made to Suspense which was new Suspense boundaries always went to fallback in a Transition while existing one participated in the Transition. It was a very clever approach to seperate creation from update. As developers could control behavior simply by how they structured their code. We implemented this as well. But more so it very much sets a precedence for what I'm proposing today.

Final inspiration for this was a comment from chat from my stream that said `post.latest || post()`. I'm unsure if the poster realized the impact this would have on my thinking but innately this is what most developers would think they'd want most of the time. It is tearing when a value has been set while holding if it isn't. While its hard to have the full context of reasoning behind these sort of decisions. I admit I haven't explored this as the primary model so lets do it.

## Proposal

High level this proposal is tear by default, explicit Transactions, and "run-once" Suspense boundaries.

Tear by default because it is the least obtrusive approach. Because there is no defined above Suspense behavior it keeps us free to hold top level with SSR. It is still desirable to push everyone to Suspense but it won't be mandatory. Additionally it won't tie their hands because by default Suspense will only go to fallback on creation. We need that for SSR but we don't need it afterwards. Updating async data will tear rather than go to fallback by default. From here explicit Transactions are still valuable for big changes. Things like routing but most people won't use them directly. Or have to worry about Suspense boundaries triggering again.

Specifically, I'm thinking of following these rules:

1. In absense of Suspense any thrown promises will only hold rendering of things that depend on them in the client. On the server we sill delay streaming.
2. Under normal operation only async values that have never been resolved throw. Once they have been resolved once they read from latest. With one exception, if they are read under a newly created Suspense boundary.
3. All async reads will register with Transactions unless they are under a newly created Suspense boundary.

## Examples

### ~~Three~~ Two modes on Initial Render

Let's bring back my example:

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

By default this would show the Nav immediately and render empty elements. It would hold effects with async dependencies until the async is done.

As before adding Suspense would allow us to show the Nav immediately but then show a placeholder until it can show the post body.

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
What about holding? Holding initially is mostly undesired as you don't have alternate content to show. In a sense initially it's like Suspense with no fallback. So this isn't applicable mode initially.

### ~~Three~~ Two Modes on Update

Now the proposal is to tear on update by default because existing resources that have resolved once resolve from latest. So are starter code here works probably as you'd expect.

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
When `props.id` changes the `Nav` will update immediately and then the post will when it comes in. So it will show the existing post with the updated nav for some period of time.

Similarly having Suspense here doesn't change that behavior.

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

Because both the Async resource and the Suspense have resolved before they won't trigger Suspense and we get tearing.

Now you might want to show a loading indicator when its tearing. We could have the Nav draw a spinner by passing it through using a `isLoading` helper. Interestingly because we hold on creation/top-level this would never appear initially only after the fact.

```jsx
function Post(props) {
  const post = createAsync(() => getPost(props.id))

  return <>
    <Nav
      selected={props.id}
      loading={isLoading(post)}
    />
    <Suspense fallback="Loading Post...">
      <h1>{post().title}</h1>
      <p>{post().body}</p>
    </Suspense>
  </>
}
```
It might seem weird to have 2 different loading affordances but one is a placeholder and the other is a loading indicator. In a sense `Suspense` probably would make more sense to be named `Placeholder`. It isn't for handling all loading states, just "initial" ones.

If you really wanted your loading indicator to be a placeholder here you could nest a `Show` I suppose.

```jsx
function Post(props) {
  const post = createAsync(() => getPost(props.id))

  return <>
    <Nav selected={props.id} />
    <Suspense fallback="Loading Post...">
      <Show
        when={post() && !isLoading(post)}
        fallback="Loading Post..."
      >
        <h1>{post().title}</h1>
        <p>{post().body}</p>
      </Show>
    </Suspense>
  </>
}
```
There is duplication here. The Show component still reads from `post` to trigger Suspense initially but basically Placeholder mode isn't really the intended mode for updates. There are exceptions I will cover in the next secion but for the most part in the same way it is difficult to hold on initial creation it is more onerous to placeholder on update.

This also suggests that you could skip Suspense and still have localized placeholders by only using the `isLoading` guard. Here it never Suspends so you would be opting out of streaming SSR and deep async discovery, but it works.

```jsx
function Post(props) {
  const post = createAsync(() => getPost(props.id))

  return <>
    <Nav selected={props.id} />
    <Show
      when={!isLoading(post)}
      fallback="Loading Post..."
    >
      <h1>{post().title}</h1>
      <p>{post().body}</p>
    </Show>
  </>
}
```

The last mode is holding here and that can be handled via Transaction. In this case our component stays the same:

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
But our action that updates props.id... maybe from the router wraps that update. Just to show the APIs in action you can picture something like this.

```jsx
function App() {
  const [postId, setPostId] = createSignal(1);
  const [isPending, start] = useTransaction();

  return <>
    <Post id={postId()} />
    <button onClick={() => 
      start(() => setPostId(id => id + 1))
    }>
      Next Post
    </button>
  </>
}
```
Most of the time you won't be writing your own Transactions but certain updates in the system will participate and this ensures that all their changes apply at the same time (similar to initial render) but they won't be blocking so your app stays responsive.

### Simple Routing

So far we've considered the basic case. And the takeaway should be that the happy path is more or less the original code we wrote with Suspense + a loading indicator. It won't interfere with normal operation going to fallbacks unexpectedly, it can participate in Transactions without requiring your code to change. It sets you up with a pattern that works universally for SSR. And the async is all non-nullable.

It pushes you into basically only 2 of the 3 modes for each phase:

**Creation:** Tear(default), Placeholder(Suspense)
**Update:** Tear(default), Hold(Transaction)

But are the creation/update boundaries so clear? For the most part I think yes. Start with router/tab example:

```jsx
function App() {
  const [tab, setTab] = createSignal("A");

  return <>
    <Nav selected={tab()} setTab={setTab} />
    <Suspense fallback="Loading Page...">
      <Switch>
        <Match when={tab() === "A"}><A /></Match>
        <Match when={tab() === "B"}><B /></Match>
        <Match when={tab() === "C"}><C /></Match>
      </Switch>
    </Suspense>
  </>
}
```
Now I've taken the liberty of adding a Suspense boundary above the `Switch`. I'm going to assume these components might be `lazy` and without a Suspense Boundary here we wouldn't show any loading affordance until we went and grabbed the component code.

While you might think technically this is an update, the `lazy` component is a new Async primitive that hasn't resolved before. So adding Suspense also means that as we navigate we go to fallback while the `lazy` component loads. If we navigate back to the same page a second time it won't go to fallback over the `lazy` component but the first time we hit it (unless we preloaded ...maybe on hover) it will.

So Suspense does what you expect. You will see a Placeholder when you navigate. If you forgot Suspense you won't see a placeholder.

And this applies to new `createAsync` primitives you might find in `<A />` or any of the pages. Since those will be new async primitives if they are read directly they will Trigger the same Suspense boundary on navigation. Since unlike `lazy` these are created everytime you navigate to the page they would trigger the fallback like you'd expect on new navigation.

However once on the page those Async primitives would never trigger that Suspense again. Updating data wouldn't do it. This means you retain full control within your page.

This not triggering fallback also includes updating search or query params. So I imagine most routers would opt into Transactions as holding semantics are preferred over tearing or Placeholders on future navigations. Since the Suspense Boundary is above the `Switch` it is already exists at the time of navigation so wrapping the tab switch be a Transaction would mean that it could hold without blocking when it does its updates. But it allows you to still tear on yours.

### Advanced Routing

The first scenario is what if you want placeholders still when there are Transactions or to show parts of your page immediately or sooner than other parts because it is ok that they come in later. The answer to both of these is nested Suspense. As a new Suspense boundary it will not participate in the Transaction and go to fallback instead, and it can catch your Async reads without trickling up to the parent Suspense boundary.

```jsx
function A() {
  const data1 = createAsync(() => fetchData1());
  const data2 = createAsync(() => fetchData2());

  return <>
    <h1>Important Data</h1>
    {data1()}
    <Suspense fallback="Loading Slow Less Important Data...">
      {data2()}
    </Suspense>
  </>
}
```
You could wrap all the data reads in nested Suspense here and if the component wasn't `lazy` or had already loaded the part outside of the `Suspense` will render immediately instead of holding or showing the outer fallback. This level of control should be enough for most things. And more importantly updating either `data1` or `data2` after the fact won't cause any Suspense boundary to trigger so you don't need to worry about having some impact of adding them outside of initial creation time.

The second scenario is what if the `createAsync` lives in Context that exists above the router. Then this is not a new Async primitive:

```jsx
function A() {
  const asyncData = useContext(AsyncDataContext) 

  return <>
    <h1>Page A</h1>
    {asyncData()}
  </>
}
```
Following our basic rules this will assume that you want to read the previous value while loading even if through navigating you triggered loading new data. The Suspense and the `createAsync` are already existing. So you will probably navigate to the page immediately and then see old data flicker before the new data comes in. Not a great experience.

Now if that update is downstream from a Transaction there are no problems. It will hold the previous value until it is ready to apply all updates. So stuff related to most routers I imagine will never experience this.

Outside of Transactions my proposed solution to this (and the reason for the caveat in rule #2 above) is if you want to show a Placeholder instead of having the weird Tear flicker... use nested Suspense. A new Suspense boundary will Suspend on an existing Asynnc resource being in a pending state.

```jsx
function A() {
  const asyncData = useContext(AsyncDataContext) 

  return <Suspense fallback="Loading Page A...">
    <h1>Page A</h1>
    {asyncData()}
  </Suspense>
}
```

This is a bit of an exception of the rules but the assumption is any new Suspense boundary expects what it reads to be consolidated before it shows anything. It would be weird to have it show and then update a moment later when it knows it will update.

## What if I don't want to use Suspense?

This approach does still allow one does not to use Suspense. It doesn't prevent future version of Solid's SSR to hold on top level async on the server. That is the key to SSR working without Suspense.

You can still use `createAsync` to hold async response on the server, or use `createEffect` to fetch in the client after the fact. In fact, you could use `Show` components + `isLoading` to guard async reads and if you were fine not streaming on the server you could avoid Suspense altogether with SSR. In fact Suspense exists on the Server purely for streaming.

In the client a tear by default approach means that things like `lazy` and `createAsync` just means impacted parts of the UI don't show up until they are available initially, and combined with the `lastest || value()` internals after the fact it isn't a concern.

The only place where this gets tricky is that once Suspense is added to the tree then new things like `lazy` and new downstream `createAsync` will trigger fallback. So it is very much recommended that libraries not implement Suspense themselves and leave that up to the application developer. While we have removed most of the jarring behavior of Suspense with this proposal, Suspense is infectious as it is an autotracking system a lot like reactivity itself.

It does seem reasonable from that perspective to have an escape Suspense boundary similar to how we have `untrack`. I wonder if something as simple as having no `fallback` could be an indicator of that intent. Maybe there are cases where someone wants to show nothing as fallback. But we could force them to do so explicitly.

```jsx
// a Suspense boundary that doesn't fallback
<Suspense>
  <div>{post().id}</div>
</Suspense>
```

## Conclusion

Well that is just a few simple examples but I think this model could be viable.

I think the key to this is introducing `createAsync` and `lazy` together with `Suspense`. However when you get past that you no longer need to immediately learn how to not trigger Suspense. You can adopt those 3 primitives as you see fit without impacting your current code. And hopefully it will encourage people to use `Suspense` more.

If successful then `Transactions` can be a more advanced topic. Truthfully this still doesn't alleviate the why the Router works the way it does without further explanation but it won't impact the localized view of your code. There is no `latest`. No undefined async. At most there is likely a `isLoading` helper which can be used against any potentially async expression/dependency graph to show loading indicators.

At first I thought it might be odd to mix local resource loading with Transactions. That we might see a lot of like `loading={isRouting() || isLoading(post)}`. But I think because of where these things will fall it will happen less often then you thing with Transcation loading states being places of the UI that our more fixed and other loading indicators being spread around.

