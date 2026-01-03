---
# System prepended metadata

title: Exploring the Nature of Async Consistency
lastmod: 2024-06-20
---

# Exploring the Nature of Async Consistency

I feel this space is difficult for people to navigate because it can devolve into a bunch of edge cases. But more so it is hard to visualize the problem space in the first place. I decided to write down some of the examples and thinking that has helped me look at this in the past and I hope it can lend to me feeling more re-assured of the desired behaviors in the future.

## Start with Sync

Pretend you have 2 pieces of data you are displaying. Let's say a username and a street address. If you were able to edit either of these there would be no concern if the display of one updated independently of the other. This is true whether they are in 2 different parts of the UI or sharing the very same Text Node.

If you had a process that involved a form that updated both as part of the same process. Ie it has fields that edit a users name and address. You might not expect these to update separately. Now given we are talking synchronous you'd probably never witness a gap.

But if there was any dependency between the the display and the different outputs like you display the name differently depending on where the user lives the order of these changes applying does matter. It impacts correctness or the amount of work being done. If you generate the display of the name before processing the address you will have to calculate it again for correctness.

Now this is the trickiest problem to solve in a sync system and it isn't too hard to find solutions for. You can ensure directionality and use scheduling. You find this built into the core of frameworks like React or built into primitives like Signals.

## Revisiting with Async

Now lets take our example and incur some additional cost that would take things async. I could use database saves etc but I'm more interested in async propagation so instaed I want to take our original example and a stylized image of the user's name that is also displayed on the page. So if the users name changes then we'd need to go generate a new image and display it as as well as showing their name directly as text.

If we independently update username or address having them come in separately is still fine. However with the name we hit our first question.

### Async Consistency

If the users name starts as "John" and we change it to "Jacob", while we could show "Jacob" immediately in our text display the image for "Jacob" is not immediately available.

We have basically 4 options here:
1. **Tear** - Show them as available but you will have both John and Jacob appear on the same page at the same time at points.
2. **Hold** - Show John until you can display Jacob in both locations.
3. **Placeholder** - Show some sort of loading placeholder for the image while you wait for it to appear with the updated name
4. **Approximate** - Not much different than a placeholder, but use the information that it will be Jacob to show Jacob text in the location that looks somewhat like the image until the image loads in.

There isn't a clear answer here for every situation. If there is a lot of input changing involved you might want to tear. Like a live searchbox.

If you are coordinating many different parts/or large portions of the UI you probably want to hold. Dropping to placeholders when you already have content is jarring and having things flying in all over the place is disorienting.

Placeholders are great in cases like above when content doesn't already exist or you know it will take a longer time.

Approximating isn't always possible as you don't always have enough information but it works best when the cost of rollback is minor and you can provide most of the functionality pre-emptively. Things like like buttons/add to cart etc are great uses.

### Consistent by Default

Tearing is the only not consistent(shows 2 separate states at the same time) option. It needs to be an option but it is probably the worst default. However, it is the default of any sync system that doesn't take async into consideration. If async is first class we probably want consistency as our default.

From the conclusions above it probably sounds reasonable to use placeholders for content not yet loaded and then to hold/approximate everything else. Since we can't approximate every case let's use holding to simplify our discussion.

### Independence

Returning to our example which is already displaying the name "John" and the image of it. If we independently update the name or the address it would be fine for those changes to come in independently but we'd expect that in the case of the name we would show "John" until we can display "Jacob" in both locations. We can show an affordance for loading without dropping back to a placeholder. If we change the name, then change the address, we'd accept that the address change appeared before the name change if they did not feel like connected processes. No more than say a ticking clock updating while we were waiting on the name.

But if they were part of the same process. A single form submission perhaps. In that case we might not expect these to update separately even if the address could update much quicker. Just like the text display of the name we'd expect the address to wait for the image. Sometimes these might be dependent, like the display of the name depending on the address, or other cases completely unrelated in display. But because it was part of the same process they update together.

I'm focusing on the same process here because I believe this is a batching by input not by output consideration. If the process to update is separate but the display of the name, image, and the address are in the same part of the UI, even in the same "effect" you'd still expect address to update independent of the image display. 

Here we have a dependency without there being a data dependency. So while we can use our data dependencies to ensure consistent propagation we also need to set bounds around our inputs that are part of the same "process". 

This is an important observation as it suggests we might need explicit controls here. We want certain updates to happen together, but more importantly we can't assume that all updates should happen together. Which brings us to...

## Time/Concurrency

There is another thing here. If our address can update independently and it needs to run the effect what does running that effect see for our name while image is pending?

```js
const [name, setName] = createSignal("John");
const [address, setAddress] = createSignal("123 Acme St");
const nameImageURL = createAsync(() => generateImage(name()));

createEffect(() => {
  console.log(name(), address(), nameImageURL())
})

// and this sequence of updates happens independently
setName("Jacob");
setAddress("222 Pan Ave");
```

Ideally it would still see "John" and we'd get 2 logs after running the update code:

```
John 222 Pan Ave *john's image url*
Jacob 222 Pan Ave *jacob's image url*
```
The first runs immediately after the setting the address and the second when the image is generated.

But how do we do that? On one had we need to commit the change of name of "Jacob" to trigger image generation but the effect that runs on the independent change would need to still see "John". One way that we've implemented in Solid is forking portions of the reactive graph and merging them back together afterwards. But it is complicated. Is there any alternative?

Well, showing the value that is updated will lead to tearing. So we definitely can't run the effect reading the updated value. If an "effect" couldn't run because it has an async dependency that is pending then you have effectively locked that part of the screen though. It would become unresponsive. More over it could also cause tearing. A different effect that depends on the non-async value could see the updated version of it.

Like if we simply didn't run the effect that depends both on name and address until the image was done, but ran an effect that only depended on address we'd see 2 different addresses. So it isn't that simple. We'd need to hold all effects that contained sources that were present in other effects that contained pending async. We could lock up a huge part of the page incidently just based on which things are grouped together.

It feels arbitrary and unbounded. Mostly it is because when it comes to understanding what graphs are connected or not we can't look at the sinks.. the effects. I'd go as far as suggesting we only care about the graph from source to async computation, because only deps leading to the async could cause it to run again. Anything downstream isn't of consequence including the effects in determining what needs to change together.

### Hierachical Bounds

In reactivity we talk a lot about data graph dependencies but when rendering UIs we've adopted models to handle nesting. In Solid we refer to the ownership graph. We've concluded above that data dependencies are key and that process level batching is essential. And that it isn't about things downstream from async points but everything leading up to it.

So what about things connected by hierarchy?

My favorite example here is tabs with data fetching. If you have tabs A, B, and C which each need their own data then navigating between them is a lot like our name/image example. In a sense the data is tied directly to the tab we want to load. We don't want to change the open tab until we have the content to show for it in the "hold" approach.

But what about other interactivity that lives on the tab? Now most UX would suggest that if the user navigates away from a page they probably shouldn't interact with it more, but what about things like animations? You probably want them to still run.

So things created under potentially async zones still need their independence when updating. This all suggests that concurrency is necessary. Because standard behavior of our ownership based system is the re-running the parent releases all the children.

It isn't enough deferring the insert. Like if had a `tab` signal that went from `'A'` to `'B'` the conditional would re-run immediately releasing tab `A` even if decided to show it until `B` was complete. We need `A` and `B` to exist simultaneous for a time.

### Another Mental Exercise - World without Suspense

Suspense is used to bail out into placeholders so any async model without it would work without them. Obviously less then ideal in initial load scenarios but it also asks the question what happens above the topmost Suspense boundary if it encounters Async. RSCs have a server answer for this question, but I want to think about this generally.

If this were allowed there feels like there are 2 options. Everything tears like we do in Solid today. Or we make everything transactional. Now the latter only makes sense if we wanted to take that approach in general I think. So what would that look like?

Well first we'd need to identify processes and it must be implicit to be the default behavior. So maybe for any change it would be consider part of the same process on the same tick.

Second, every state change would assume it couldn't be applied immediately and need to fork its graph. There would probably be some performance impact here.

Third, we'd need a way to opt out of this behavior. Like a typeahead search would be pretty awkward as the text input couldn't get ahead of the search results. Responsiveness in general is the argument against transactions by default.

But what would the opt out look like? Would you wrap the state setter? `applyImmediate`? I suppose the weirdest part is that if the default was transactional and someone added async deps later your responsiveness could be impacted without a direct tie. A new sink suddenly slows down the page unless you guarded it.  This does seem backwards.

## Conclusions

It is nearly impossible to automate transactional boundaries. There is a tension between responsiveness, especially of inputs and this desire to have everything apply at once. What things go together goes beyond dependencies and probably needs to be explicit.

Concurrency seems unavoidable. It would be great to keep things simple but tearing is difficult to avoid and blocking is untenable in many situations.

Because of both those facts it seems like we are still stuck on explicit transaction model if we want to have tools in this area.