---
# System prepended metadata

title: Musing on Server Component Designs
lastmod: 2023-10-11
---

# Musing on Server Component Designs

It feels like everything comes down to serialization when you talk about partial hydration. We need to have clear boundaries so that is why Qwik has it's `$` and why we added `$` for Start/Bling.

Islands are no different. So I'm very swayed towards the decision of what is a client component to be from the outside.

But I do understand it can also be an identity. So in a sense you really need both. Especially when you think about packages out in the ecosystem.

## Looking at React

In React/Next (honestly sometimes hard to tell which part is why) they have 3 mechanisms.

1. `"use client"` - import me as a client component
2. `"use server"` - I am an RPC call that runs on server, only in server components
3. `import "server-only"` - I need to be on the server or else..
    * 3.5 `async` functions are just for the server 

#### Reprocussions of React's Approach

* It is not clear from the outside what type of component you are dealing with
* The current ecosystem needs to go add some `use client` all over the place, or consumers will be creating extra file wrappers
* It's clunky to wrap client-side higher order behaviors around RPC calls (Picture client `cache` around them)
* Behaviors for RPC aren't configurable (GET vs POST etc)
* `use client` & `use server` look equivalent but they aren't

## Alternative

### Set Client Components/Islands from the Outside

New in TS 5.3 and Stage 3 spec we have [Import Attributes](https://devblogs.microsoft.com/typescript/announcing-typescript-5-3-beta/#import-attributes) which appear to not have any defined behavior for custom attributes.

So could we not:

```jsx
import Component from "./component" with { client: true }
```

While subtle this is more detectable at bundling time and you can see your client components in the file.

### Use $Server() for RPC

I put the `$` at the front instead of the end to match some other macros. Honestly that part doesn't matter that much just originally when designing `server$` we put it at the end as a sort of after thought and to follow Qwik's convention but these aren't really custom or fully composable. Because they rely on hoisting all closures are lost so the author of the Server RPC has to be the one that provides the wrapper. This is true of `use server` as well in React, but there are some benefits.

```js
export const func = clientWrapper($Server(serverWrapper(fn), configOptions)

// vs with use server

// server-func.js
`use server`
export const f1 = serverWrapper(fn);

// server-api.js
import { f1 } from "./server-func.js"
export const func = clientWrapper(f1);

// no equivalent for configOptions
```

First of all it works well all in one file regardless of how you want to wrap it or if the definition falls in a client or server component.

Yeah there are concerns here with bundling but if you don't extract closures there are no surprises here in terms of what gets included and you can always still put it in a seperate file.

I think the convention for naming should be clear like maybe using PascalCase after a $ or all caps or something. The challenge is if put in libraries those libraries will not work without this feature. It's good in that if someone does really need `$Server` functionality they can't risk it coming in the wrong place.

### `use client` & `use server` as Compiler Hints

The idea is these are completely optional. If people add them to packages great if not well it might limit options but no harm. Also if being used in application that doesn't support Server Components these are just nothing.

The thing is if you try to import a client component that isn't marked as a Server Component.. unless it does something not allowed on the server like read Context it will probably work. It won't be interactive but like that isn't the expectation either because you didn't import it as such. But if someting is marked as `use client` well bundling will fail if you try to import it.

Similarly if someone tries to import a `use server` in a client component the bundler will fail. This can also be used as an indicator to help tools like linters detect if people may be doing illegal things.

## Conclusion

I think the alternative addresses almost all my concerns with the existing RSC approach. In Review:

* It is clear what components you are dealing with from the outside for serialization purposes
* `use client` is optional although whole files/modules would be imported as either client or server if they don't. No extra file wrappers.
* Easy to wrap RPC calls in Higher Order Functions
* RPC behaviors are configurable
* `use client` & `use server` are equivalent opposites

I think the need to know about serialization may prevent us from ever automating these things completely. Like `use client` or `use server` in this proposal could be unnecessary at some point in the future but things like the import statements or $Server would not be. We need to give developers indicators of what they are doing. And I think I'm OK with that.