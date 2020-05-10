---
date: "2019-09-14"
title: "Lodash FP usage retrospective"
category: "War stories"
tags: ['FP', 'lodash']
banner: "/assets/bg/newjersey.jpg"
---

My current project is completing its third year. From the start, we've been using aggressively the Lodash FP library through our whole JS & TS codebase, whether it's on the Back-End or Front-End. I recently performed a small analysis of our usage of the library to spot some weird usages that have slipped through code reviews and make a small retrospective about how this tool and functional programming are used in a mature production app.

The results of the analysis were sometimes surprising as some of the sanctified FP tools show little usage on our side, while some lesser-known or more basic functions are widely popular. Let's dig in after a small digression about the lib itself.

### Lodash... FP?

Lodash (https://lodash.com/) is a widely used library in the JavaScript ecosystem. It provides invaluable algorithmic tools that can save developers lines of code, time and bugs. Its less known sibling is Lodash/FP. As per the documentation, this build is providing "immutable auto-curried iteratee-first data-last methods.". If those terms are a bit complex to you, [this chapter of this great book](https://github.com/MostlyAdequate/mostly-adequate-guide/blob/master/ch04.md) will provide some invaluable lessons.

This lib is not the only contender nor the most advanced in the FP world but our team chose it because it's much easier to train new team members with it. Most JS software developers have some experience with Lodash or Underscore and very few are familiar with the concepts behind Ramda or Pointfree-fantasy.

### So, what are the biggest contenders

The code analysis focused on the number of imports of each Lodash function our main Web App. This is less precise than counting the number of usages of each function but this still gives a good representation of our usage. We grouped some of the functions as they share a common role.

#### get and getOr

This may come at a surprise, but we use `get` & `getOr` a lot (close to 200 imports with usually a lot of usage per import). They are by far the most used Lodash functions in our codebase. These are nice getters functions that allow to define a path for an attribute in a simple or complex object and retrieve the value.

```javascript
const data = {
  a: {
    b : 1
  },
  c: 2
};

// FP variant puts the data as last argument (and this is great)
const b = get('a.b', data);

console.log(b); // 1
```

The first reaction to all newcomers is a big "Meh", but after a short time, team members usually adopt it massively. I have always been doubtful with "advanced" accessors until I came across Lodash's (probably because most of the accessors I saw in the past were used to perform side effects). We don't have a specific policy to access all attributes like that, but it makes a lot of sense when using the FP variant of Lodash and a point-free style. These two functions have two pros and one con:

* Con: typing attribute path inside a string always raises a warning in my heart. The linter is usually powerless to help us against a typo although TypeScript can perform some nice type inference. In our team, most of the `get` & `getOr` usages can be found either in redux selectors (where we have 100% test coverage policy) or in React components. Our experience is that years of usage of these functions did not translate the risk highlighted above into bugs.

* Pro: They provide safeguards against a null or undefined value in the middle of your chain. The [Optional Chaining](https://github.com/tc39/proposal-optional-chaining) EcmaScript proposal is about to nullify this pro. This has been very valuable for us, especially in conjunction with GraphQL where graph queries can easily return nulls.

* Pro: The FP variant of these functions shines. Using builtin currying & reverse order of arguments, we can build easy to write and use getters around our code. To that purpose, we only have to call the `get` function with only the path as argument. It will return a nice function that can take any kind of compatible data structure.

```javascript
import { get } from 'lodash/fp';

const data = {
  a: {
    b : 1
  }
};

// Here we put the currying into practice to build a getter function.
const getB = get('a.b');

// The function only need the last argument to be executed. 
// This is why we like data-last functions.
console.log(getB(data)); // 1
```

The getters can easily be extracted and shared. Naming those functions is often very valuable to abstract deep attribute access in data structures (think `getUserNameFromToken`). Its curry feature also leads to building many unary functions (functions that take only one argument) that are fantastic for function composition. It then does not come as a surprise that `flow`, a function composition tool is the second most used Lodash function in our code base.

#### flow

Flow comes next in our list (80 imports). This is a typical FP tool used for function composition (aka function centipede).

There are several ways to perform function composition, they are illustrated below with different implementations of the same function:

```javascript

import { compose, flow } from 'lodash/fp';

const foo = num => num + 1;
const bar = num => num * 4;
const baz = num => num - 1;

// all these functions are equivalent
const composeManually = data => foo(bar(baz(data)));
const composeWithLodashCompose = compose(foo, bar, baz);
const composeWithLodashFlow = flow(baz, bar, foo); // also pipe

```

`compose` is often the classic tool for people coming from an FP background as it reads in the same way as the manual composition, but `flow` reads sequentially left to right and is, therefore, the first choice of all other people. It also reads the same way as a promise chain. The team made an early decision in favor of `flow`.

These tools are the best friend of point-free functional programming adepts. They work with unaries (see where we're going...) and enable to write very readable and pure functions:

```javascript
import { capitalize, filter, flow, get, map } from 'lodash/fp';

const userToken = {
  user: {
    permissionList: [
      {
        name: 'serviceA',
        enabled: true
      },
      {
        name: 'serviceB',
        enabled: false
      },
      {
        name: 'serviceC',
        enabled: true
      }
    ]
  }
};

const getEnabledPermissionList = flow(
  get('user.permissionList'),
  filter({enabled: true}),
  map('name')
);

console.log(getEnabledPermissionList(userToken)); // ["serviceA", "serviceC"]

//You can also extract all parts of your composition
const getUserPermissionList = get('user.permissionList');
const keepEnabledPermissions = filter({enabled: true});
const mapNames = map('name');

const getEnabledPermissionList2 = flow(
  getUserPermissionList,
  keepEnabledPermissions,
  mapNames
);

// Flow composes also nicely into other flows
const getUpperCaseEnabledPermissionList = flow(
  getEnabledPermissionList,
  capitalize
);

console.log(getUpperCaseEnabledPermissionList(userToken)); 
// ["SERVICEA", "SERVICEC"]

```

If you compare to chained APIs, this is incredibly superior. Each piece is testable individually and you can build and name intermediate functions to represent business concepts. Sometimes we use such a business name to convey meaning to very simple operations. We have no general rule about when to use a writing style that shows the reader how an operation is performed (`map('propertyA')`) or one that shows its meaning and abstracts the implementation (`const formatForUI = capitalize`).

Although it's not mandatory to use pure functions, they provide a lot of benefits. First, it's more testable and reusable but it also enables things like memoization to boost performance.

In our codebase, most of our redux selectors and data structure manipulation are built using `flow`. Every time an operation is expensive, the resulting function is wrapped with caching (using Lodash's memoize, redux's reselect or react memoization tools).

#### negate & friends

`negate` is our fifth most imported Lodash function. This can look original for something that dumb.

```javascript
import { flow, isEmpty, negate } from 'lodash/fp';

const isEven = num => num % 2 == 0;
const isOdd = negate(isEven);
const isOddOldWay = num => !isEven(num);

const hasAtLeastOne = negate(isEmpty);

const hasAtLeastOneTruePermission = flow(
  getEnabledPermissionList, // reuse from above :)
  hasAtLeastOne
);
```

This is my experience that it's better to build opposite functions based on only one implementation. In imperative programming, a small `!`  is often used, but as we are manipulating functions, having a function that wraps another one and returns the opposite boolean is very useful. Classic point-free style bonus, it also reads very well and is hard to typo.

This function is accompanied by a lot of small utilities that perform also dumb things like `eq`, `isNull`, `isNil`, and others. The spirit is the same. On the same occasion, we stopped spending time on the best way to detect `null` from `undefined` or checking is a number is really a number. Time is better spent elsewhere, believe me...

#### map vs reduce vs forEach

48 `map`, 5 `reduce` are 5 `forEach`. Wow, I didn't expect to have so few reduces and so many forEach. After close examination, all the `forEach` are justified. If you are not familiar with those, they are the bread and butter of every FP article out there. One often unquoted benefit is the reduction in bug density due to the avoidance of index manipulation. In the same spirit, the team favors functional tools to perform direct access to specific elements in an array (`head`, `tail`) or array destructuring. But let's go back to our iterators.

`map` usage seems pretty standard to me. The idea of a type transformation (think projection) applied to a list can be applied everywhere. One might wonder why we do not use the native `Array.prototype.map`. Again we don't have a specific rule about it, but Lodash's map applies to object and map collections, can use the builtin `get` style iterator and benefit from the curry/data-last FP combo. Of course, it means a lot of unaries easy to name, reuse, test and compose.

`reduce` might an FP star, but in the end, Lodash's utilities, probably often built on top of `reduce` solves most of our use cases. I would still recommend the function for studying purposes. I was expecting that some of the heavy FP recipes that we use might be one day refactored in a high-performance unreadable piece of code relying on `reduce` or older fast loop tools, but, after some iterations on performance analysis, none of these have been flagged for a rewrite. Speaking of performance, we have what I would consider a high number of `memoize` imports in the codebase, especially after having most of the expensive stuff in redux selectors already using memoization techniques from the fantastic `reselect` library.

I have a personal hatred for `forEach`. I have countless times seen people use in code interview as a poor's man `map` or `reduce`.
The indication that it returns `undefined` should hint that something is off. My understanding of the function is that it should be used only to manage side effects (and indeed, all of our cases fall into this category after close examination).

In case you are asking yourselves, there is no `while`, `for` or `for of` statements in our project.

#### cond

I already wrote about `cond` [earlier](https://codingwithjs.rocks/blog/better-branching-with-lodash-cond). I love the function and one might wonder why we only have 10 imports. The number of `if` and ternaries is much much bigger. That can be explained easily by the fact that we have very few complex branching in our codebase and the vast majority of them are using cond. Redux's selector still relies on nice old `switch` statements.

#### FP specifics (constant, identity, tap, stubTrue, etc.)

Finally, there is a list of contenders that can seem very strange for an imperative programmer. These are mostly simple functional wrappers that fit well the API of not only our tools but all the JS ecosystem and base language. `curry` should need no introduction at this stage (if so, [you've missed a link to a nice article in the Lodash... FP section](https://github.com/MostlyAdequate/mostly-adequate-guide/blob/master/ch04.md)).

`constant` returns a function that returns the same value it was created with. Its main role can be found in our `cond` functions. It can easily be replaced by a small arrow function like `() => 2` but it for me it reduces the cognitive load to have plain English instead of a function expression and helps when talking about code.

```js
import { cond, constant, identity, stubTrue } from 'lodash/fp';

const takeCorrectBranch = _.cond([
    [isMainCase, transformDataAccordingly],
    [isSpecialCase, constant(MY_SPECIAL_VALUE)],
    [isError, handleError],
    [stubTrue, identity] //stubTrue being often renamed as `otherwise`
]);
```

The example above also features `stubTrue` and `identity`. `identity` is used in a variety of situations like with a `filter`, `groupBy` or `sortBy`. Again, these tools can be replaced by simples functions like `() => true` and `val => val` but for the same reasons, we prefer the English term.

Let's close this section by speaking a bit about `tap`. It's bit more complex than the others since an implementation would be `interceptorFunction => input => { interceptorFunction(input); return input; }`. As you can see, it returns a function, that will forward the input (like `identity`), but it will execute the interceptor function with the value before forwarding it. It is used to trigger side effects in compositions like `flow` or in promises chains. We often wrap side effects with `tap` even if they already return their input when we want to signal at that the original data is forwarded and/or that a side effect is taking place.

```js
import { flow, tap } from 'lodash/fp';

const addDataToMap = flow(
  toGeoJson,
  filter(isUseful),
  tap(logIt),
  tap(displayOnMap)
);
```

Even though you have no idea how the `toGeoJson`, `isUseful`, `logIt` and `displayOnMap` work, it's easy to get an understanding of what the `addDataToMap` function does and what its API is.

### Conclusion

Our global Lodash usage reflects a lot about how our team thinks and solves technical problems. We use a functional programming style to favor meaning over absolute code performance (which is tackled by other means). Adopting the language (a lodashy one in our case) is a bit hard for newcomers coming from an imperative world, but once acquired, it provides great benefits for maintainability, analysis, and team communication.

### Appendix: whole usage list

Here is the whole list of our Lodash function imports in one of our Front-End codebase. If you are interested in some that I didn’t cover, feel free to contact me.

| name           | count |
| -------------- | ----- |
| get            | 166   |
| flow           | 80    |
| map            | 48    |
| getOr          | 28    |
| negate         | 22    |
| isEqual        | 22    |
| isNil          | 20    |
| isEmpty        | 18    |
| isNull         | 17    |
| curry          | 17    |
| filter         | 15    |
| find           | 14    |
| keyBy          | 12    |
| orderBy        | 10    |
| memoize        | 10    |
| cond           | 10    |
| tap            | 9     |
| includes       | 9     |
| stubTrue       | 7     |
| noop           | 7     |
| sortBy         | 6     |
| pick           | 6     |
| identity       | 6     |
| head           | 6     |
| assign         | 6     |
| values         | 5     |
| set            | 5     |
| reduce         | 5     |
| forEach        | 5     |
| remove         | 4     |
| range          | 4     |
| partial        | 4     |
| last           | 4     |
| every          | 4     |
| take           | 3     |
| partialRight   | 3     |
| has            | 3     |
| groupBy        | 3     |
| contains       | 3     |
| concat         | 3     |
| zip            | 2     |
| uniqueId       | 2     |
| unionWith      | 2     |
| trim           | 2     |
| toNumber       | 2     |
| size           | 2     |
| reverse        | 2     |
| placeholder    | 2     |
| once           | 2     |
| mapValues      | 2     |
| isUndefined    | 2     |
| intersectionBy | 2     |
| initial        | 2     |
| eq             | 2     |
| defaultTo      | 2     |
| constant       | 2     |
| zipAll         | 1     |
| xor            | 1     |
| valuesIn       | 1     |
| uniqBy         | 1     |
| uniq           | 1     |
| thru           | 1     |
| takeRight      | 1     |
| tail           | 1     |
| startsWith     | 1     |
| spread         | 1     |
| some           | 1     |
| slice          | 1     |
| reject         | 1     |
| rangeStep      | 1     |
| pickBy         | 1     |
| mergeWith      | 1     |
| max            | 1     |
| keys           | 1     |
| isNumber       | 1     |
| isNaN          | 1     |
| isFinite       | 1     |
| indexOf        | 1     |
| floor          | 1     |
| flatten        | 1     |
| flatMap        | 1     |
| findIndex      | 1     |
| equals         | 1     |
| differenceWith | 1     |
| debounce       | 1     |
| compact        | 1     |
| ceil           | 1     |
| assignAll      | 1     |