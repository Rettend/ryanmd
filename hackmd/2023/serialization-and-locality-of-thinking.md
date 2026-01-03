---
# System prepended metadata

title: Serialization and Locality of Thinking
lastmod: 2023-10-17
---

# Serialization and Locality of Thinking

One of the most valuable characteristics that come from modern declarative frameworks is locality of thinking. Immutability(Read/Write) segregation gives us comfort that we know what we pass down doesn't get modified without our knowledge. Treating values in as reactive ensures that we don't need to worry about how the parent consumes it.

But the concerns for serialization are a bit different. It is the knowledge of what we pass goes to the client (or server). And that is only something we control for our immediate descendants.

We need to know because:
* Don't want to put secrets in the client
* We don't want to cause the app to fail with unserializable data

While we can take comfort when we know our serialization boundaries directly, any component in between hides that knowledge from us.

#### Consider:

We have a component that we consume that is a Server Component. Inside of it we have a client component that requires one field. When we adopt the package we look at it and see that, and make sure we send something for that which we know can go to the client.

We install an update and now there is additional client component inside that requires use of other data you were giving this server component. You are none the wizer and it attempts to go to the client without your knowledge.

## Secrets

Secrets can leak even with the best intention. We can't use knowledge of serialization boundaries as a safe guard. This is as true for Server components or Server functions.

We can help people on a happy path by forcing seperate files, but one level of indirection and it is no longer obvious looking at the file you are looking at. 

Explicit serialization boundaries are help a lot when looking at local code, but at best we can only know for sure at those boundaries. It is no guarentee what we can do is safe from a secrets perspective.

In so Secrets or ServerOnly parts that need to be guarded need to be guarded at the source regardless.

## Serialization Limitations

The resolution here has to be that a Component is responsible for the serializability of props it receives that it would pass into a child requiring serialization. If its needs change its external types should change to reflect this.

#### Consider:

Server Component A and Server Component B are maintained by 2 different teams. Both consume Server Component C, which has a Client Component D.

> A   B
   \ /
    C
    |
    D(client)

The team behind A decides that C now needs to be a client component to get the functionality they need. They move the client boundary up and change the types appropriately. This causes Component B to fail TS build as it was passing some props to C which weren't serializable.

This is what we want to see. Early detection. With this the impact of refactors can be known immediately.

## Closure Extraction

So, the best we can do is make well typed interfaces that take serializability in mind. Does this put Closure Extraction in an awkward place as there is no contract here? Bringing client to the server is probably inconsequential but both server to client and server to server have potential of pulling in things unintended. Server to server is especially tricky as it looks like it is server on both sides but it needs to pass through the client.

That being said the impact of Closure Extraction is only local. It doesn't escape local scope which means as long as people within a file can clearly see the boundary and understand the implications then this still falls in locality of thinking as any external serialization needs are still reflected through Types.

## Errors

Sometimes things go wrong. Strong contract is fine on data, but what if you get something unexpected that would break serialization. 

#### Consider:

Someone uses Axios to fetch data in your application. Your data is typed in such a way that it is serializable, and the promise itself is serializable. However, Axios fails and gives you an error message with unserializble fields on it.

There isn't much that can be done here. The framework doesn't want to wrap every error it gets. It wants to leave them as close to the source as possible. The developer using Axios could make their own custom error wrapper, but they will have a tendency to overwrap.

Only if the Errors are well typed they could understand which needed wrappers. But that does still take some doing. It's the right solution but it probably means handling errors should likely have special care because not everyone is as vigilant as they need to be and type contract is all we have.

## Conclusion

Communicating serialization so that it is understood from the outside is essential. However, only from the perspective of what is serializable so that the application functions. Secrets can't be solved by API but requires a mechanic (like `secret$` etc). In so all we have is the type contract ultimately.

Locality of thinking is not completely possible with serialization, so it is questionable how much adding more friction adds here. When I say not possible I don't mean in the way people can always mutate/immutable data breaking something, but in that even with the perfect instruction things can still leak.

And with that knowing what a Client component is from the outside isn't necessary (it's built into the prop types). This is a large justification for React's Server Component APIs.