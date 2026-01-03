---
# System prepended metadata

title: Passthrough Projections
lastmod: 2025-07-24
---

# Designing Passthrough Projections

I realize after the last writeup I focused too much on previously identified use cases. Let's attack this instead mechanically.

I actually think this approach is a bigger game changer than I realized. I think projections may replace some store use cases today.

It comes down to fundamentals again. Stores are mutable by design so they aren't really capable of being immutable. It is sort of counter intuitive that that they could diff and remain immutable. I've come up with a smart way to do immutable internals but why should Stores diff? Interopt. To be fair this may still be needed. But what if we just assumed there a was a diffing primitive?

## Diffing Primitive

What if there was no `reconcile`? Stores just set values in their setter. What if you wanted to take an immutable value and make it granular it was a different primitive. Because it handles derived immutable values it could also handle being derived from stores as well. 

Now when we think diffing we might think of Immer but the problem with Immer is that you do all the changes and then end up with a whole referentially diffable tree. Basically it is designed for something like React to check against all the references from top down as it renders. We lose information we had where we mutated.

So no we want to keep mutable APIs so we can granularly update but we don't want to mutate underlying objects. So what if we diffed on assignment. No special functions. Just whenever you assigned a new value it would diff.

You would need some idea of "key" for identity but every object would merge, primitive value equality check and array compare indexes.

It seems expensive at first but it scales with how large the immutable source is you assign. If you assign primitive values it is a equality check. If you assign a new object or one that matches on key then it diffs the properties, if you assign a non-keyed match it is a replace at that point.

Now the trick here is to not mutate anything though so while we keep an underlying object reference for passthrough. Any difference from it is layered on top. And it stays that way until that property is re-assigned or the parent is re-assigned.

## Basic Scenarios (Source Change)

### Signal Object Source

Let's pretend we have a Signal that is an object. What does assigning it to a projection do?

There are two scenarios I suppose:

```js
const [s, setS] = createSignal({
  a: 1,
  b: 2
});
                         
const p1 = createProjection(p => {
  p.o = s();
});
                         
const p2 = createProjection(p => {
  Object.assign(p, s());
});
```
What I imagine what is wanted in these scenarios is:
```js
setS({
  a: 1,
  b: 3
})
// causes p1 and p2 to rerun

// also triggers
p1.o.b;
p2.b;

// doesn't trigger
p1.o.a;
p2.a;
```

Conceptually a projection creates a memo around the value on read. In reality I imagine that what happens is that a signal is created on read that initially gets the underlying value. In `p2` it will see property assignments and update the signals without updating the underlying object. In `p1` when we assign the new object it won't match or see a key so it will replace the underlying object in the signal for (s.o) and update any signals that exist (similar to `reconcile`). 

It does suggest we need Signals on writes even when not read. Or that we keep an additional object that has shadowed values. Both approaches might be fine.

### Store Object Source

```js
const [s, setS] = createStore({
  a: 1,
  b: 2
});
                         
const p1 = createProjection(p => {
  p.o = s;
});
                         
const p2 = createProjection(p => {
  Object.assign(p, s);
});
```

```js
setS(s => {
  s.b = 3;
})
// causes p2 to rerun

// also triggers
p1.o.b;
p2.b;

// doesn't trigger
p1.o.a;
p2.a;
```

With the same structure it would be identical except p1 wouldn't rerun. The underlying store change would trigger the projected value. In fact p1 never runs more than once since if it just assigned `s` it actually didn't track any reactivity.

However p2 would rerun as `Object.assign` accesses `s.a` and `s.b`. Those values being primitive means it basically would work the same as the Signal example with a shallow compare finding `b` had changed but `a` had not.

<details>
<summary>Implementation Considerations</summary>
This example does feel extraneous to create a Signal around `a` when the underlying store is actually doing the work. More so we have to make sure further changes propagate. Ie.... `s.b` is also tracked when you listen to `p1.o.b`. While `p1.o` is an internal signal of the projection.. `o.b` is tracking from the underlying store and the potential projection override.

It would be interesting if the solution was using `writableMemo`s everywhere. Seems expensive, but under consideration.

Ok let's get back to expected behavior without getting too mired in implementation. 
</details>


### Signal Array Source

I think the first observation is there is no easy way to turn an array into another array. There is no `Object.assign` in the same sense.. You can assign Object indexes to an array. But that doesn't account for length etc... You can `concat`, but that isn't what we are going for either.

In the basic case assigning a specific array index is the same as assigning an object property so let's focus on array replacement. For primitive values it is fairly simple. Any array change where the length or an index value changes causes the array to trigger the $TRACK symbol. We also independently trigger the specific index if it is different.

```js
const [s, setS] = createSignal([1, 2]);
                         
const p = createProjection(p => {
  p.a = s();
});

setS([1, 2, 3]); // causes p to rerun

// triggers
p.a.length
p.a[$TRACK];
p.a[2];

// does not trigger
p.a[0];

setS([1, 2, 4]); // causes p to rerun

// triggers
p.a[$TRACK];
p.a[2];

// does not trigger
p.a[0];
p.a.length;
```

### Store Array Source

Stores aren't all that different than the passthrough example for objects because if we are assigning array without iterating into it is on the store notify:

```js
const [s, setS] = createStore([1, 2]);
                         
const p = createProjection(p => {
  p.a = s;
});

// does not cause p to rerun just trigger direct
setS(s => {
  s.push(3)
}); 

// triggers
p.a.length
p.a[$TRACK];
p.a[2];

// does not trigger
p.a[0];


// does not cause p to rerun just trigger direct
setS(s => {
  s[2] = 4;
})

// triggers
p.a[$TRACK];
p.a[2];

// does not trigger
p.a[0];
p.a.length;
```

### The Rest

To be fair for basic scenarios of source change we have all the examples above with more complicated objects. Maybe keyed ones but it doesn't change a ton. A key mismatch is treated the same as a primitive value, and everything else(including key match) is treated like an array or object merge like described above. Let's use a more involved example to illustrate:

```js
// pretend this is a createAsync etc
const [todos, setTodos] = createSignal([
  { id: 1, title: "Write Demo", completed: false },
  { id: 2, title: "Write Article", completed: false }
]):

// project them:
const p = createProjection(s => {
  s.todos = todos();
})

// update 1 - add a todo
setTodos([
  { id: 1, title: "Write Demo", completed: false },
  { id: 2, title: "Write Article", completed: false },
  { id: 3, title: "Promote on X", completed: false}
]);
// triggers projection `p` and through diff triggers 
// `p.todos.length` causing downstream `<For>` to render new row

// update 2 - complete todo
setTodos([
  { id: 1, title: "Write Demo", completed: true },
  { id: 2, title: "Write Article", completed: false },
  { id: 3, title: "Promote on X", completed: false}
]);
// triggers projection `p` and through diff triggers
// p.todos[0].completed updating single row

// update 3 sort and update
setTodos([
  { id: 1, title: "Write Demo", completed: true },
  { id: 3, title: "Promote on X", completed: true },
  { id: 2, title: "Write Article", completed: false }
]);
// triggers `p` and through diff triggers `p.todos[$TRACK]`
// causing `<For>` to update thanks to index changes
// also diffs matching items to see todo with id 3 has changed to
// completed. This combined with the move will do a fine grained
// update of at `p.todos[1].completed`. 
```

<details>
<summary>Note on Normalization</summary>
After writing this I was trying to decide if normalization would help performance but in the case of immutable data from the server it wouldn't as there is no references kept which means all data needs to be diffed regardless. In an immutable situation where references are kept we can still short cut going deeper based on referential equality.
</details>

## Doing Better

Source examples are illustrative and I think they go a long way showing the base power of this primitive. It can turn any source into a granular one purely through assignment. Still this doesn't feel in these examples that different than just returning an immutable value and diffing it because we are assigning pretty much top level.

### Overrides

However when talking about overrides it is a different situation because might walk into the array and update single thing. I hate to use the selection example again but I will use index this time to keep code simpler. But this is basically the Strello demo we've been doing.

```js
const p = createProjection(p => {
  const selected = selectedIndex();
  if (hasUpdated(todos)) {
    p.todos = todos();
  }
  if (selected !== p.selectedIndex) {
    if (p.selectedIndex != null)
        delete p.todos[p.selectedIndex].selected;
    p.todos[selected].selected = true
  }
  p.selectedIndex = selected;
})
```
In this scenario when the update isn't caused by the input todos updating only value changes are primitive values which mean we are just doing a couple challow compares.

So same as current `createProjection` just with no need for `reconcile`. A `reconcile` by default approach is inherently more expensive but it is more expected I think when you are taking immutable blobs and trying to make them granular.

#### Array Overides

Array Overrides are a bit more interesting because while one could just assign value there is an expectation that mutable operations work. Like `.push` or assigning at an index. We could just shadow indexes and length.. or we could shadow with a new array.

It has interesting reprocussions. Because shadowing the array means that any source array change would wipe out your changes on re-assign. But if the array is a Store itself capable of fine grained changes.. then what does an index override operation mean. Does it mean that it could sit on top even if the underlying model changes. Things like `.push`/`.shift`/`splice` become interesting because they can resolve the index they operate on at initial run but not after source update. It means order matters which is tricky. If the operations were encoded instead it would be possible to always replay on top of the source. However, that would really call into question how long of history makes sense to be kept. I don't see that being a place we'd want to live.

Fortunately since these sort of operations are not idepotent the developer needs to worry about them anyway so it seems unlikely to be a problem in a reasonable case. But we might be forced to make an array specific decision regarding default behavior.

### Get Rid Of the Branching??

The real question I think is now that everything just looks like assignment with no explicit `reconcile` or `reset` can we get rid of the code branching in this logic.. ie could we just:

```js
const p = createProjection(p => {
  const selected = selectedIndex();
  
  p.todos = todos();
  if (p.selectedIndex != null && selected !== p.selectedIndex) {
    delete p.todos[p.selectedIndex].selected;
  }
  p.todos[selected].selected = true
  p.selectedIndex = selected;
})
```
I think the answer is yes. If `todos()` hasn't referentially changed then we can shortcut the diff on it and only run the selection logic. If it `todos()` that triggered this logic we'd need to run the selection logic anyway to reset the selection.

The only problem is if selection hasn't changed. But we cleared it and then added it back again we triggered something unnecessarily. I do wonder if this is an example where Alien Signals approach could work. Since if we kept the old value until resolved then we could unmark its dirtyness if it returned to the original value before it was read. Which is the case here. Diffing Todos might clear the value out but the signal would exist as long as something is listening which it would be in the UI.

Ok that's nice but are there edge cases. First thought stores... p.todos is never going to show up different in a diff here (same store reference). Well if the underlying store updated super granularly like updated `completed` on a todo. Our selected state wouldn't clear out anyway because the same todo would still be in place. So the override would basically be a no op.

How about if the mutation isn't selection but instead something that overrides the base Todo list.. like an extra temporary item.. (like an optimistic update)? In that case you wouldn't want a different change (like selection) to cause a reset.

There are a few ways to model this. Obviously if we were to `[...todos(), tempTodo()]` we end up with a new array and then have to diff every time.. Sure the items are unchanged so it's a quick shallow diff but are there other options? Probably not without some sort of branching:

```js
const p = createProjection(p => {
  const selected = selectedIndex();
  
  p.todos = todos();
  if (hasUpdated(tempTodo) && tempTodo()) {
    p.todos.push(tempTodo());
  }
  if (p.selectedIndex != null && selected !== p.selectedIndex) {
    delete p.todos[p.selectedIndex].selected;
  }
  p.todos[selected].selected = true
  p.selectedIndex = selected;
})
```
This doesn't really work. Like either it overrides the index and then it needs to cleaned up.. reconciled at some point in the future. Picture multiple in flight additions. It would be a bit of a pain to figure out which ones need to be removed and which ones need to be re-added.. maybe in a different location if the source list changed.

Or you assume that it gets wiped on new `.todos` assignment which means it always diffs if we don't guard that assignment.

I realize that I'm using the previous selectedIndex as a cheat here to avoid branching (and cleanup work). In a sense I'm trying to write code the way I would in an immutable system. As in create the next output I want, rather than just change what is needed. Diffs make that tempting but also are more expensive as you end up diffing everything anyway.

So basically I can conclude if we believed we should always get rid of branching we might as well just be making a diffing `createMemo` rather than something that allows for more granular control. You can always get back to that with this:

```js
const p = createProjection(p => {
  const selected = selectedIndex();
  const sourceTodos = todos();
    
  p.todos = [
    ...sourceTodos.slice(0, selected),
    { ...sourceTodos, selected: true },
    ...sourceTodos.slice(selected + 1),
    tempTodo()
 ];
});
```
It's definitely simpler to write.

### Actual Advantages??

Well if at one extreme we fallback to a diff and project the world. What's the other extreme look like?

```js
const p = createProjection(p => {
  const m = message();

  if (m.type === "ADD") {}
  else if (m.type === "REMOVE") {}
  else if (...) {}
})
```

Yeah ton of branching with each trigger describing a change to the data that it is operating on. With this there is miminal diffing with granular updates. Funnily enough the source here least resembles the output.

### Does this design lend to function form of Stores

Like should these projections be writable from the outside. It's interesting because I think the internals are different than those of stores. They don't have to be though. Is it weird to have something internally diff and externally write?

I mean a better question might be implicit diffing vs not in general. I chose not to originally with Solid Stores for performance. If we introduce a diffing by default primitive it might not be clear which mode we are acting in.

## Conclusion

I need to just make the thing so we can play with it. There are a few take aways from the last couple posts.

1. Projections shouldn't mutate their sources. There may be a few solutions to this but that is core principle.

2. Ideally we want to restrict the range in which we diff, which can diff based on the type of operation we do. At the extremes we either diff everything, or communicate in diffs. It is questionable whether the middle needs to exist.

3. Mutation pushes you into thinking in terms of discrete events instead of stabilized state.

4. Even with all this exploration, and even with some flux in API design, the current projection design should atleast be sufficient to test scenarios even if we decide we can streamline it later.

I guess that's it.