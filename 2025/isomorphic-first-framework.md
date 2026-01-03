---
# System prepended metadata

title: Isomorphic First Framework
lastmod: 2025-10-23
---

# Isomorphic First Framework

Seeing the reception to SvelteKit Remote functions and Tanstack Start I realize I probably should codify the architecture we designed on stream.

It is important to differentiate this architecture from Server First which has dominated the conversation the past few years. And this will probably help us decide where to take things next.

## So what do I mean by Isomorphic First?

I mean an architecture that at its core runs on both server and client. This differs from classic Marko, Astro, Next.js, Remix 3, Fresh, etc...

It's base expectation is code can run either side. SPAs with SSR are like this. Qwik is like this. You can also view this whole thing as client first, but the fact code can run on both sides is important to its identity.

The benefit of this model is it reflects the reality of how apps behave after initial load. As much as we create a full page reload mental model with Server First frameworks, the client ofetn manages the routing in these tools as things evolve. It persists state.

It is easier to approach from a SPA perspective because you don't need to reverse your thinking. You don't need to uppend your app from the root. More so interactions with the server stay granular. While waterfalls are a risk that is no different than client today. And we can do somethings to help safeguard that.

Finally if isomorphic is your base, then client/shared components don't need special denotation. It's only things that run in a specific environment that need to be identified. `use server` means server only. `use worker` means that. Maybe `use prerender`. The use of directives doesn't matter, prefer file extensions it is the same thing.

## This Architecure is Doing Great Today

Isomorphic Preloaders, Server Function (or Remote Functions if you prefer), better non-blocking async Reactivity with concurrency, Streaming SSR. These pieces all allow this architecture to flourish today. We've added things like optimistic updates (thank you Remix), and things like Single Flight Mutations.

Today the modern take that started with [SolidStart](https://start.solidjs.com/)(See my talks from Vite Conf the past 3 years[[2022](https://www.youtube.com/watch?v=G5vwaoXck_g&list=PL16vUvov3c5D1_KlYevpriA9QMkVkY32l), [2023](https://youtu.be/XMybh3gCmQ0?si=CRNr-K1FvXw0QUbk), [2024](https://youtu.be/S0-fhGskPYA?si=LwBBoX64pz48l81u)] or where I put it all together and made my called shot [The Shape of Frameworks to Come](https://www.youtube.com/watch?v=ZVjXtfdKQ3g)) is available in both Svelte and React as well via SvelteKit and Tanstack Start.

Cosmetic differences but essentially the same architecture which is just an evolution of the SPAs we've always made.

## So no Server Components?

Not necessarily. There is server only code. You could have a Server Function return dynamic HTML templates. I wrote [Are Lakes Real?](https://hackmd.io/@0u1u3zEAQAO0iYWVAStEvw/SJo9se7XJx) a while back to show a model where you could do Server Components with all their benefits with an isomorphic first approach. To be fair it is just as complicated and challenging as any other Server Component solution but it is a thing.

I've been skeptical of Lakes in general because it is easy to cause Server => Client => Server waterfalls. However to be fair this is a problem in all Client first architectures and we've been doing just fine with that for over a decade. I realized as I talked to Tanner more about this approach the key to it is seperating the templating from the data needed to render. The reason one can end up with incidental waterfalls so easily is if the interface is just a Component, just something you pass props to it isn't obviously how your composition impacts things.

Whereas if Server Components are something you return from Server Functions all the patterns we've classically had to hoist still work. (Keep in mind these aren't the final APIs, just to illustrate).

```jsx
async function getMyServerComponent(id, { children }: { children: JSX.Element }) {
  "use server"
  const data = await db.getSomething(id);

  return <div id="server">
   {data}
   {children}
  </div>
}

function App(props) {
  // wrapper over `createAsync`
  const Server = createServerComponent(() => getMyServerComponent(props.id));

  return (
    <Server>
      <div id="client">Hello</div>
    </Server>
  )
}
```

One could preload their Server function in the route preloader, they could call multiple at the top of the their components. But the important part is the children projections, slotting/props will never cause a Server component to re-render. The View code doesn't cause re-renders but the fetching does. You have to update the `use` or the underlying `createAsync`. I think this while subtle is a huge difference over just naively importing Server components in Client scope or using abstractions like `<Frame>` to do HTML partials because those generally tie the mechanism to the UI. 

And the thing is the Server Component can pass arguments back to the client by render props. I covered that in my other writeup, so yes it does compose back and forth. The fundamental difference though is the client is a single tree and the server isn't. Which can in theory cause waterfalls, but also means we aren't beholden to reloading the full page, or full route section to update parts from the server. You get partials without having to mark the client side coming back in. No `use client` or `island` or `hydrated`.

Sure no one has done this today, but I like that there is a path forward that is consistent with the mental model.

## To the Future

I wrote this up because I wanted to call out this pattern. I want to acknowledge it so that we can build upon it. Server Components is one direction here. Resumability is another. These aren't mutually exclusive. What they share is a view that you are trying to build one app. Now it might seem weird to attempt that on top of the web which is clearly a Server/Client model. But of those two, for most infrastructure, only one side keeps the persistent connection. This does sort of double down on local first mentality of the client being a source of truth.

This is not HTMX or PHP, this is the evolution of the SPA. Straddling the line is hard. As much as we should recognize leveraging the server more improves initial load considerations, leveraging the client more improves interactive potential.

What's interesting to me is whenever we move closer to the server there is this tension to use non-JS on the backend which feels real. Like render your Server Components in Go. Where this pretty much flies in the face of that a bit given the SPA is the base. But on the otherhand Server Functions could be done in a different language as long as they could serialize the same. Doesn't help with SSR admittedly but it is interesting. I wonder if there is a future where things marked with `use server` just get deployed to a different server closer to the DB and the rest goes to the edge or the browser. Atleast there is no ambiguity there.
