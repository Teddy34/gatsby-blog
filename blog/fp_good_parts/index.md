---
date: "2020-02-11"
title: "FP: the Good Parts"
category: "FP"
tags: ['FP', 'Lodash']
banner: "/assets/bg/vedene.jpg"
---

Functional Programming is a trending topic. Is it only hype or bringing real value? How can this help you today? This article aims at giving you practical ways in which you can improve your codebases using FP style programming.

#### Functional Programming? Maybe not so scary
It's an alternative to Imperative Programming which dominates the market. In practice, FP offers predictability and strong abstractions at the cost of efficiency. Usual descriptions of FP are highlighting its "mathematical" aspect and never fail to mention quickly Category Theory, Functors, Monads and other scary names. Without a basic understanding of many of those concepts, writing a program in one of the strict functional languages (Haskell, Lisp, Elm, etc.) is a difficult task. But the truth is that you don't need to go deep into the Functional world to benefit from its qualities.

As always in this blog, we're using JavaScript as the base language. Although not a ["real" functional language](https://www.youtube.com/watch?v=eetWam3nhoM), JavaScript offers a lot of features to write a program using an FP **style**. We will focus on this article on how to get quickly the best of FP with the cheapest cognitive load.

### Number one: write more pure functions

Pure functions are the bread-and-butter of FP. A function is pure when given the same input, it produces the same output and performs no side effects. Coupling the output with the input forbids to use things like randomness, closures or current date in our pure function. Side effects are all changes outside of the scope of your function (displaying on the screen, writing on the filesystem, performing a network call, performing a mutation on an external object).

Here are some examples:

```javascript
// The output cannot be predicted from the input
const getNow = () => Date.now();

// Side effect: Mutating the input is considered a crime
const doStuff = (list, newVal) => list.push(newVal);

// Side effect: Mutating an internal state is very bad
const createFunctionWithState = () => {
  let internalValue = 1;
  return () => internalValue++;
}

// Side effect: this basic class usage is not pure either.
class MyClass {
  constructor(initialVal) {
    this.internalValue = initialVal;
  }
  setVal(newValue) {
    this.internalValue = newValue; 
  }
}

// Side effect: Triggering I/O is bad
const fetchData = url => fetch(url);

// Side effect: This is technically an I/O so it's bad, but not as bad as the previous one
const logThis = label => console.log(label);
```


Pure functions are easy to understand as there is no dark magic happening anywhere. Nothing else has to be considered but the input and the output. Using and reusing the function again can be done with confidence that nothing is going to be affected anywhere in the program. Tests for pure functions should never need any stubbing mechanism, making them very simple to write and maintain. This is of course very suitable for Test Driven Development (the practice of writing tests before implementation).

All frameworks are compatibles with pure functions and all codebases will benefit from using them. You can start with small utility functions or extract parts of a big function. This practice will naturally grow into your codebase. You will be naturally tempted at some point to reuse and share those small functions in other parts of the code. Please resist a bit from doing so at first; more on this later in this post.

Writing code using more pure functions is very easy to do and will provide great benefits for your code. This is the single best improvement that FP can bring to a codebase.

### Number two: replace manual loops

FP provides a new set of algorithmics primitives to replace progressively imperative operators such as `for`, `switch`, `if` or `try-catch`. They favor strongly readability and safety while fitting perfectly in your new pure functions. Let's go through the most useful of them by finding a replacement for your loops. Array.prototype already implements all these functions so we will use it as an example, but the concept works with all kinds of iterables.

#### Filter

One of the most common operations to perform is to loop in a list, to find/remove elements that match some criteria. All of these operations can be reduced to a simple name: filtering. A *filter* uses two inputs: a list (very often an Array but not necessarily) and a predicate. The predicate is a pure function that takes an item of the list as input and returns a boolean. Because our *filter* is pure, it must not mutate the original list but instead return a new filtered list. The original items themselves can be cloned (expensive) or more probably are just added (fast) in the new list.

Here is how *filter* will improve the readability of your code. If you see a *filter* keyword somewhere, you can immediately:
- be sure that there will never be an index handling bug.
- guess the API of the predicate function, without even looking at a type definition or its code.
- assume that no other data transformation has been performed.
- assume that the input has not been mutated
- finally, you can skip to the next line because you know what the output will be: a new list of same type items, filtered by some condition that can be usually guessed looking at the name of the predicate.

```javascript
  const getStrictPositiveNumbers = list => list.filter(value => value > 0);

  const getValidValueList = list => list.filter(isValid);
```


#### Map

The *map* function is strange at first. It seems less powerful than a `for` and yet it is one of the most widely used FP primitive.
It applies on a list an iteratee function (pure of course) that transform each item into something else. The output list is kept in the same order.

With *map*, again, you will improve your code readability:
- like with *filter*, no index error is possible.
- like with *filter*, nothing should have been mutated.
- you know that the size and order of your list are the same.
- the API of the iteratee will determine what will be the type of your output list.

```javascript
  const getUserName = user => user.name;
  const getUserNameList = userList => userList.map(getUserName);

  // A bit of reusuability here. There are ways to optimize performance if needed.
  const getFormattedUserNameList = userList => getUserNameList(userList).map(userName => userName.toUpperCase());

  // A lot of things can be guessed about the computeShapeArea function
  const getShapeAreaList = shapeList => shapeList.map(computeShapeArea);
```


The *map* function has also some longer-term potentials due to its mathematical properties that we will not address here. It's a solid foundation for your codebases.

#### Reduce

This is the swiss knife of FP. It would probably be worth a full article about how to use (and many people have done so), but the truth is that I use *reduce* quite rarely and probably so should you. Here are the important things to do know with *reduce*:
- *reduce* is the operation of transforming a list into a value. That value can be another list, a single number or anything else.
- You should expect purity from code in a *reduce*.
- Its best use is to build other tools (sum, group by, etc.). You can do almost anything with it.
- The second best use is to encapsulate complex imperative (pure) code. This is handy when addressing performance.
- It improves code readability by highlighting that a pure special operation is performed here. By providing a good name to the iteratee, it can be pretty fantastic to read.

Here are some examples:
```javascript
const sumAll = numberList => numberList.reduce(
  (memo, currentItem) => memo + currentItem, // memo is the return value of the previous iteration ,
  0 // initial value for the memo
);

const groupBy = (list, key) => 
  list.reduce((memo, currentItem) => {
    const currentItemKeyValue = currentItem[key];
    if (memo[currentItemKeyValue]) {
      // The groupBy function owns the memo so the mutation below is fine in this context.
      // However, extracting the reduce iteratee would expose an impure function
      memo[currentItemKeyValue].push(currentItem);
    }
    else {
      memo[currentItemKeyValue] = [currentItem];
    }
    return memo;
    }, {}
  );

const getMax = numberList => numberList.reduce(
  (memo, currentItem) => currentItem > memo? currentItem: memo,
  -Infinity 
);
```


#### ForEach

Some closing words on *forEach*. It looks like a *map* but it returns undefined. The only thing that can, therefore, be done with it is performing side effects (mutations, network calls, logging, etc.). All programs have to deal at some point with side effects and with all our purity oriented refactorings, we have pushed mutation in some very specific places. They are harder to test but their scope has been shrunk, making them more manageable.

- If you see a *forEach*, that should trigger a purity alert. An interesting property to mention here is that a pure function can only use pure functions. The stain of impurity propagates upward and therefore a function executing a *forEach* is impure.
- This marks the end of a chain of pure operations to actually do something.
- The side effect in itself has been isolated into a function. It's testable separately.
- There are other advanced ways to manage side effects in FP but this would bring us to some scary FP words.

#### Assemble these building blocks to solve problems

By using tools like *map*, *filter* and *reduce*, you will be creating a vocabulary for you and your teammates that can help you talking about code and decompose algorithms into simple elements. Describing a feature that has a combination of these FP keywords will be a rich and powerful experience. Let's take an example:
To send a newsletter to users that have accepted it. It's easy to describe the requirement as to *filter* users that want the newsletter, *map* them to their emails and *forEach* email, send the newsletter. This is how this would be translated in FP style JavaScript: 
```javascript
userList
  .filter(isUserInterestedByNewsletter)
  .map(getEmailFromUser)
  .forEach(sendNewlettersByEmail)
```


It is at the same time readable in plain English, robust and gives very strong indications about the API of each step.

Many other tools can be explored. They almost always have the same characteristics: they are very generic, pure and easy to combine.

Using these FP building blocks will improve a lot the readability and maintainability of your codebases. 

### Number three: find better names for your functions

My last Functional Programming advice for this blog post is to improve naming conventions for functions. It's amazing at how pretty much all of the books and online resources repeat this over and over and yet this is one my first comments when reading code. 

Here are some basic rules about function naming:
- it should use a verb to tell us what it will do.
- it should have a meaning aligned with the business context of your function.
- it should use the same word for the same concept everywhere.
- it should do only one thing.
- it should not describe how it is implemented.
- it should be maintained over time.
- if you have trouble naming the function, then its scope is probably incorrect.

An interesting tip that you can use to improve function naming is using aliases. In the end, good function names and API are more important than implementation.

### Bringing it all together

Now let us play a bit with function naming while revisiting some previous items:

```javascript
// Classic data scientist coding style. With a comment on top if you are lucky.
const doStuff = (a, result=[]) => {
  for (let e = 0; e < a.length, e++) {
    result.push(x(a[e])[0]); //Oops, mutation
  }
}

 // Improved version that use a basic building block and better names.
const takeFirst = list => list[0]; // takeFirst is a great FP base tool (also known as head)
const getStudents = classList =>
  classList
  .map(x) // still quite obscure function taken from first example. It needs to be pure.
  .map(takeFirst);

// Improved version that aliases functions into a business oriented name
const takeBest = takeFirst //takeFirst is imported from your toolkit.
const getStudentListSortedByAscendingRank = x;
const getBestSchoolStudentList = classList =>
  classList
  .map(getStudentListSortedByAscendingRank) // note that we do not care how this function is implemented
  .map(takeBest);
```


Of course, FP goes far beyond these first steps. There are nicer ways to write functions, with better performance or readability. There are also tools for all sorts of situations including side effect management and error handling. The FP world is vast but it's not needed to have extensive knowledge of it to get most of its benefits.

Applying these three principles only will have a severe positive impact on a codebase. It will reduce bug density, new feature complexity and even need for code documentation. All of that for a very cheap cognitive load.

Functional Programming can enhance your code, even without any framework or library. Give it a try!