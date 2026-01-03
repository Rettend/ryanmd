---
# System prepended metadata

title: Are Lakes Real?
lastmod: 2025-02-20
---

# Are Lakes Real? SCs without "use client"

I've long put it out there that Lakes are Islands poor alternative. They are waterfall inducing and most implementations basically just kill hydration at that point. But what if we try to make them work anyway?

We have a few things working in our favor.

* Client is persistent, we don't actually need to serialize everything to communicate it.
* Lakes don't require the same level of compiler gymnastics. Server functions are sufficient.
* While they don't solve serialization duplication client routing just works without a special router.

That's attractive. Solid's JSX on the server already outputs HTML so the hardest part would be supporting streaming. But maybe we can worry about that later as this could be made more granular.

## Concept

What if there was no `use client` only `use server`. But via wrapper certain server functions could be denoted as components.
 
```js
const Comp = component(async (props) => {
  "use server";
  const data = await db.getThatData(props.id);
  return <div>
    {props.header}
    {props.children(data)}
  </div>
})

// client component
function NormalComp(props) {
  return <Comp id={props.id} header={<h1>Hello</h1>}>{
    (data) => <Data data={data} />
  }</Comp>
}
```
You'd serialize all the normal arguments. JSX would would be a named placeholder, and functions would be serialized as placeholder of sorts.. On the server placeholder would remain opaque.. function would be a function that serialized the arguments passed to it and returned a placeholder.

Whenever id or header changed it would trigger and upon return do the appropriate replace of placeholders and call callback. On initial SSR the `<Comp>` would be treated as Async.. sort of like a Lazy Component. It could trigger Suspense.. handle streaming. There might be a few extra placeholder elements in the markup. Props could be inserted as many times as desired.

```js
const Comp = component(async (props) => {
  "use server";
  const [data, data1] = await Promise.all(
     db.getThatData(props.id),
     db.getThatOtherData()
  );
  return <div>
    {props.header}
    {props.children(data)}
    {props.children(data1)}
  </div>
})
```
Where things are fun is nesting.

Certain waterfalls are unavoidable always:
```js
function NormalComp(props) {
  return <ServerListings cityId={props.id}>{
    (data) => <Data data={data}>{
      <ServerSimilarProperties id={data.id} />
    }</Data>
  }</ServerListings>
}
```
However if data is available above.. like from the URL that wouldn't be a constraint. Like if the dependency is purely layout:
```js
function NormalComp(props) {
  return <ServerProfile userId={props.id}>{
    (user) => <User user={user}>{
      <ServerPosts userId={props.id} />
    }</User>
  }</ServerProfile>
}
```

Using renderProps is problematic for waterfalls but it is the means of injecting data. I mean you could always hoist yourself:

```js
function NormalComp(props) {
  const serverPosts = <ServerPosts userId={props.id} />
  return <ServerProfile userId={props.id}>{
    (user) => <User user={user}>{
      {serverPosts}
    }</User>
  }</ServerProfile>
}
```

Without render props f someone did something Like nest Server Components they could be parallelized:
```jsx
function NormalComp(props) {
  return <ServerProfile userId={props.id}>{
    <ServerPosts userId={props.id} />
  }</ServerListings>
}
```
Because the server cannot be an input to this component it would be possible even if the server renders its children 10 times, for the client to run this code exactly once and just replace it 10 times.

It is not perfect because server still decides overall visibility but it might be acceptable. It's bit like when you hoist data fetching you might never need but can do so because it can be parallelized.

## Hackernews

Hackernews recursive comments are tricky. Could this work and save on double data? Well let's focus on the first part.

Just because we remove client components on the server side doesn't mean that we can do recursive projections.


Consider:

```js!
const Story = component(async ({ id, children }) => {
  "use server";
  const story = await getStory(id);
    
  return (
    <div class="item-view-header">
      <a href={story.url} target="_blank">
        <h1>{story.title}</h1>
      </a>
      <div class="item-view-comments">
        <p class="item-view-comments-header">
          {story.comments_count ? story.comments_count + " comments" : "No comments yet."}
        </p>
        <ul class="comment-children">{
          story.comments?.map(
            comment => <Comment comment={comment}>{children}</Comment>
          )
        }</ul>
      </div>
    </div>
  );
});

const Comment = ({ comment, children }) => {
  return (
    <li class="comment">
      <div class="by">
        <a href={"/users/" + comment.user}>{comment.user}</a>
        {comment.time_ago} ago
      </div>
      <div class="text" innerHTML={comment.content} />
      {comment.comments.length ?
        children(
          comment.comments.map(
            comment => <Comment comment={comment}>{children}</Comment>
          )
        ) : null}
    </li>
  );
}

const Toggle = (props) => {
  const [open, setOpen] = createSignal(true);

  return (
    <>
      <div class="toggle" classList={{ open: open() }}>
        <a onClick={() => setOpen(o => !o)}>{open() ? "[-]" : "[+] comments collapsed"}</a>
      </div>
      <ul class="comment-children" style={{ display: open() ? "block" : "none" }}>
        {props.children}
      </ul>
    </>
  );
} 

export default function StoryPage(props) {
  return <Story id={props.id}>
    {(comments) => <Toggle>{comments}</Toggle>}
  </Story>
}
```

It's worth pointing out to get fine-grained rendering we'd probably need to talk in proxy objects in something like Solid. So all the callback functions would return proxies that were data diffed I suppose. 

### Serialization

Probably similar to what we've done before.. I could picture something like:
```js
const data = [];
data[0] = `<div>
            <ul>
              <div><!--toggle id=1--></div>
              <div><!--toggle id=2--></div> 
            </ul>
          </div>`;
data[1] = `<ul>
            <div></div>
            <div><!--toggle id=3--></div> 
          </ul>`;
data[2] = `<ul>
            <div></div>
            <div></div> 
           </ul>`;
data[4] = `<ul>
            <div></div>
          </ul>`
}
```
Where each chunk would be a key value and be swapped into place in the client. To be fair server side Suspense could be handled the same way.

In fact maybe we'd still want to use `createAsync` instead of awaiting as way to be able to stream responses. If we used Signal rendering then really it is like initially rendering all over again. This seems quite doable for Seroval.

## Prop Handling

I think the hardest part of this is recognizing props required for re-render versus not. Or props for cache key versus not. Things like JSX or these render functions aren't really props as much as pass through projections so they can probably be ignored if the assumption is they aren't inspectable.

Like we don't care if `header` changes maybe?
```js
function NormalComp(props) {
  return <Comp id={props.id} header={<h1>Hello</h1>}>{
    (data) => <Data data={data} />
  }</Comp>
}
```
Well I guess that isn't true. If `header` on a whole changes we could care, but like fine-grained updates don't matter. Maybe that is fine. Then again we could just tunnel it through the Server component. Basically wrap the expression in an effect that inserts it without ever running the server function again seems even better.

But without have like prop types we can't make that assumption until runtime. The awkwardness is preload because for JSX types even if you didn't have the JSX to pass in you'd need to like pass something in to do it at runtime. Preload is a thing here because you can cause waterfalls and you can have multiple server function roots throughout your app like any sort of API.

```jsx
// solid start FS routing
export const route = {
  preload() {
      <Comp id={props.id} header={<></>}>{() => {}}</Comp>
  }
}
```

It's a little weird.. I'm ok with that but there is complexity there. You could make some API with Zod etc to type these and maybe that would make it easier.

## Double Data?

So does this fix anything here? Not really on the surface. Like looking back at our Todo example. Everything passed to our renderProp from the server needs to serialize. Ie.. all the comments:

```jsx
export default function StoryPage(props) {
  return <Story id={props.id}>
    {(comments) => <Toggle>{comments}</Toggle>}
  </Story>
}
```
And we are duplicating that in the HTML. Well unless we don't? I guess the same considerations apply around reversing the template from the rendered HTML.

One thing that can be done is reconstruction only from the serialization and not as part of the HTML. This would need more code up front if it were to work before the page hydrated. We only care about the HTML up to the first Loading Placeholder. Everything after that can be manipulated to hell really.

Opposite is trying to always build from the HTML if available. Async is the problem with looking to see if a prop is used before deciding to serialize or not. It is possible the answer to solving double data is skipping serialization and relying on reversal for everything up to the first flush, and then only serialization afterwards.

But to be fair Lakes vs Islands here make no difference. This is the same mechanical issues. Which brings me to...

## Thoughts So Far

Honestly this is just a different API for the same thing really. So on the positive it isn't really all that different than the work Nikhil, Alexis and I have done in the past and talked about doing more in the future. Tanner inspired me to look into this and after sharing my thoughts he seems more excited by the result than I am.

It is cool there is no need for `use client`. And there is something nice about just basically making any old Solid component a Server Component simply by running it in a server function. Truthfully because it can be made granular Ie.. you could have 4 different server functions being called in a route section, and preload etc. So you could say only invalidate one of them similar to our router `query` API. 

But reality is you often want to weave the rendering like I showed in the Hackernews example so is new power that important? I don't know. Honestly I need to make more sense of why I want Server Components at all. This approach is the least obtrusive (nothing really core) mechanism I've thought up as of yet so it leaves room to experiment. But it isn't long before you hit the same problems again. And I think I have more important things to think about right now.