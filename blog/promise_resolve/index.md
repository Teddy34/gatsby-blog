---
date: "2020-03-09"
title: "The hidden power of Promise.resolve()"
category: "Programmer lifehacks"
tags: ['Promise', 'WebDev']
banner: "/assets/bg/vedene.jpg"
---

There are many reasons why I love promises. Truth to be told, I often prefer them to the more recent `async-await`, more on that on another time, probably.

Today, we will be looking at a small good pattern that I like with promises.
Let's consider for a moment that code:

```javascript
const our_function_bad_version = url => {
  return some_fetching_function(url)
  .then(do_stuff_with_it)
  .catch(my_nice_error_handler)
}
```

I have seen this kind of code many many times. A significant proportion of the readers might assume that if anything goes wrong, the nice error handler will be called. Oh, dear!

Now let's take a look at the first promise chain function implementation:

```javascript
const some_fetching_function = url => {
  if (!url) {
    throw new Error();
  }
  return fetch(url);
}
```

Surprise! It does not always return a promise...
Obviously, we would have never written a function that throws instead of returning a failed promise but hey, you never know how things can throw, especially with external code. Note that a good type system would flag the inconsistent return type.

So what happens if it will send a nasty empty string as URL? The `some_fetching_function` never returns a promise. Its execution will throw an error. Since there's no try-catch, it will try to find the first parent that has one in the call stack and we don't have one in `our_function_bad_version`. Therefore an error is thrown upward, unhandled.

How can we improve the situation? Adding a try-catch would be awful as it would propagate the bad `some_fetching_function` API that by returning a promise or throwing an error.

#### Promises know how to handle errors

JavaScript promises are using the [Promise/A+ specification](https://promisesaplus.com/).
It defines what happens if one of the callbacks of a `promise.then` function throws an exception:

```
promise2 = promise1.then(onFulfilled, onRejected);
[...]
If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason.
```

So regardless of what happens in one of the callbacks, we will get a lovely (but maybe rejected) Promise.

#### Enters a new challenger: Promise.resolve()

The [JavaScript spec](https://tc39.es/ecma262/#sec-promise.resolve) specifies that the Promise constructor provides a resolve function that returns a resolved Promise with its parameter as promise value.

We can therefore write something like this:

```javascript
const our_function_good_version = url => {
  return Promise.resolve(url)
  .then(some_fetching_function)
  .then(do_stuff_with_it)
}
```

The nasty `some_fetching_function` is now executed as onFulfilled callback of the Promise.resolve(url) promise. The initial argument is passed correctly to the function. That way it is guaranteed that the promise chain will not be broken. A simple look at the function is enough to understand how `our_function_good_version` behaves without never looking at any of the onFulfilled function code. Isn't it neat?

I almost always start a promise chain with a Promise.resolve(). Some lazy exceptions can be made when the first link of the promise chain is declared in a way that is already strongly coupled with our current chain.

#### The case for unaries

One might ask what happen with functions that take many arguments. It's always possible to have an anonymous function calling it and rely on closures:

```javascript
const our_function_good_version = url => {
  return Promise.resolve()
  .then(() => some_other_fetching_function(url, arg2, arg3))
  .then(do_stuff_with_it)
}
```
 
It's also possible to use a wrapper object or array (rarer). The object is typically used for parameter naming.

```javascript
const our_function_good_version_with_object_unary = (namedParameters) => {
  return Promise.resolve(namedParameters)
  .then(({ url, arg2, arg3 }) => some_other_fetching_function(url, arg2, arg3))
  .then(do_stuff_with_it)
}

const our_function_good_version_with_array_unary = (...argumentList) => {
  return Promise.resolve()
  .then(() => some_other_fetching_function(...argumentList))
  .then(do_stuff_with_it)
}
```

Not fantastic but much safer than `our_function_bad_version`. I don't have these cases very often in my code base due to classic Functional Programming patterns. FP loves unary functions (functions that take only one argument). They are easy to reason about (transformation of input type A to output type B), we have many ways to build them (currying & partial application) and consume them (functors, composition & monad). It turns out that Promises have a lot to do with FP and it does not come as a surprise that the callback signatures are unaries. It would be difficult to chain properly promises if it was not the case.  

But let's close this short post and take a look back at the original problem. The begining of promise chains are often vulnerable to runtime errors. Wrapping the beginning of your promise chains with a Promise.resolve() is a great way to avoid bugs. Let them all have one.