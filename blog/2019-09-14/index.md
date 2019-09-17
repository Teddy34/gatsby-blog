---
date: "2019-09-14"
title: "Lodash FP usage retrospective"
category: "lodash"
tags: ['WebDev', 'FP', 'lodash']
banner: "/assets/bg/newyork.jpg"
---

My current project is completing his third year. From the start, we've been using aggressively the Lodash FP library through our whole JS & TS codebase, whether it's on the Back-End or Front-End. I recently performed a small analysis about our usage of the library in order to spot some weird usages that have slipped through code reviews and make a small retrospective about how this tool and functional programming are used in a mature production app.

The results of the analysis where sometimes suprising as some of the sanctified FP tools show little usage on our side, while some lesser or more basic usages are widely popular. Let's dig in after a small digression about the lib itself.

### Lodash... FP?

Lodash (https://lodash.com/) is a widely used library in the JavaScript ecosystem. It provides invaluable algorithmic tools that can save developpers lines of code, time and bugs. Its less known brother is lodash/FP. As per the documentation this build is providing "immutable auto-curried iteratee-first data-last methods.". If those terms are a bit complex to you, [this chapter of this great book](https://github.com/MostlyAdequate/mostly-adequate-guide/blob/master/ch04.md) whill provide some invaluable lessons.

This lib is not the only one contender in the FP world but our team chose it because it's much easier to train new team members with it.

### So, what are the biggest contenders

The code analysis focused on the number of imports of each lodash function our main Web App. This is less precise that couting the number of usages of each function but this still gives a good representation about our usage. We grouped some of the function together as they share a common role. 

#### get and getOr

This may come at a suprise, but we use `get` & `getor` a lot (close to 200 imports). They are by far the most used lodash functions in our codebase. These are nice getters functions that allows to define a path for an attribute in a simple of complex object and retrieve the value.

```javascript
const data = {
  a: {
    b : 1
  },
  c: 2
};

const b = get('a.b', data); // FP variant puts the data as last argument (and this is great)

console.log(b); // 1
```

The first reaction to all newcomers is a big "Meh", but after a short time, team members usually adopt it massively. I personally have always been doubtful with "advanced" accessors until I came accross lodash's (probably because most of the accessors I saw in the past were used to perform side effects). We don't have a specific policy to access all attributes like that, but it makes a lot of sense when using the FP variant of Lodash and a pointfree style. These two functions have two pros for me and one con:

* Con: typing attribute path inside a string always raises a warning in my heart. The linter is usually powerless to help us against a typo although TypeScript can perform some nice type inference. In our team, most of the `get` & `getOr` usages can be found either in redux selectors (where we have 100% test coverage policy) or in React components. Our experience is that years of usage of these functions did not translate the risks highlighted above into bugs.

* Pro: They provide safeguards against a null or undefined value in the middle of your chain. The [Optional Chaining](https://github.com/tc39/proposal-optional-chaining) EcmaScript proposal is about to nullify this pro. This has been very valuable for us, especially in conjunction with GraphQL where graph queries can easily return nulls.

* Pro: The FP variant of these functions really shines. Using builtin currying & reverse order of arguments, we can build easy to write and use getters around our code:

```javascript
import { get } from 'lodash/fp';

const data = {
  a: {
    b : 1
  },
  c: 2
};

const getB = get('a.b');

console.log(getB(data)); // 1
```

The getters can easily be extracted and shared. Naming those functions is often very valuable to abstract deep attribute access in datastructures (think `getUserNameFromToken`). This currying usage also lead to building many unary functions (functions that takes only one argument) that are fantastic for function composition. It then does not come as a surprise that `flow`, a function composition tool is the second most used lodash function in our code base.

#### flow

Flow comes next in our list (80 imports). This is a typical FP tool used for function composition.

There are several ways to perform function composition, they are illustrated below with different implementations of the same function composition:

```javascript

import { flow } from 'lodash/fp';

const foo = num => num + 1;
const bar = num => num * 4;
const baz = num => num - 1;

// all these functions are equivalent
const composeManually = data => foo(bar(baz(data)));
const composeWithLodashCompose = _.compose(foo, bar, baz);
const composeWithLodashFlow = _.flow(baz, bar, foo); // also pipe

```

Compose is often the classic tool for people coming from a FP background as it reads in the same way as the manual composition, but flow reads more sequentially left to right and is therefore the first choice of all other people. It also reads the same way as a promise chain. The team made an early decision in favor of flow.

These tools are the best friend of point free functional programming adepts. They work with unaries (see where we're going...) and enable to write very readable and pure functions:

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

// Flow composes also nicely
const getUpperCasePermissionList = flow(
  getUserPermissionList,
  capitalize
);

console.log(getUpperCasePermissionList(userToken)); // ["SERVICEA", "SERVICEC"]


```

If you compare to chained APIs, this is incredibely superior. Each piece is testable individually and you can build and name intermediate functions to represent business concepts. Sometimes we use such a business name to convey meaning to very simple operations. We have no general rule about when to use a writing style that shows the reader how an operation is performed (`map('propertyA')`) or one that shows its meaning and abstracts the implementation (`const formatForUI = capitalize`).

Although it's not mandatory to use pure functions, they provide a lot of benefits. First it's more testable and reusable but it also enables things like memoization to boost performance.

In our codebase, most of our redux selectors and data structure manipulation are built using flow. Everytime an operation is expensive, the resulting function is wrapped with caching (using lodash's memoize, redux's reselect or react memoization tools).

#### negate & friends

`negate` is our fith most imported Lodash function. This is a small surprise for something that dumb.

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

This is my experience that it's better to build opposite functions based on only one implementation. In imperative programming, a small `!`  is often used, as we are manipulating functions, having a function that wraps another one and returns the opposite boolean if very useful. Classic point free style bonus, it also reads very well and is hard to typo.

This function is accompagnied by a lost of small utilities that perform also dumb things like `eq`, `isNull`, `isNil`, and others. The spirit is the same. By the same occasion, we stopped spending time of the best way to detect `null` from `undefined` or checking is a number is really a number. Time is better spent elsewhere, believe me...

#### map vs reduce vs forEach

48 `map`, 5 `reduce` are 5 `forEach`. Wow I didn't expected to have so few reduces and so many forEach. After close examination, all the `forEach` are justified. If you are not familiar with those, they are the bread and butter of every FP article out there.

`map` usage seems pretty standard to me. The idea of a type transformation (think projection) applied to a list can be applied everywhere. One might wonder why we do not use the native `Array.prototype.map`. Again we don't have a specific rule about it, but Lodash's map applies to object and map collections, can use the builtin `get` style iterator and benefit from the curry/data-last FP combo. Of course it means a lot of unaries easy to name, reuse, test and compose.

`reduce` might a FP star, but in the end, Lodash's utilities, probably often built on top of `reduce` solves most of our use cases. I would still recommend the function for studying. I was expecting that some of the heavy FP recipes that we use might be one day refactored in a high performance unreadable piece of code relying on `reduce` or older fast loop tools, but, after some iterations on performance analysis, none of these have been flagged for a rewrite. Speaking of performance, we have what I would consider a high number of `memoize` imports in the codebase, especially after having most of the expensive stuff in redux selectors already using memoization techniques from the fantastic `reselect` library.

I have a personal hatred for `forEach`. I have countless times seen people use in code interview as a poor's man `map` or `reduce`.
The indication that it returns `undefined` should hint that something is off. My understanding of the function is that it should used only to manage side effects (and indeed, all of our cases fall into this category after close examination).

In case you are asking yourselve, there are no `while`, `for` or `for of` statements in our project.

#### cond

I already wrote about `cond` [earlier](https://codingwithjs.rocks/blog/better-branching-with-lodash-cond). I really love the function and one might wonder why we only have 10 imports. The number of `if` and ternaries is much much bigger. That can be explained easily by the fact that we have very few complex branching in our code base and the vast majority of them are using cond. Redux's selector still relies on nice old `switch` statements.

#### FP classics (constant, identity, tap, stubTrue, etc.)

### Appendix: whole usage list

88 different usages

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