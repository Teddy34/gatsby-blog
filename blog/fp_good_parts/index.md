---
date: "2029-02-03"
title: "FP: the Good Parts"
category: "FP"
tags: ['FP', 'Lodash']
banner: "/assets/bg/newjersey.jpg"
---

Functional Programming is a trending topic. Is it only hype or really bringing something to programming? How can this help you day today? This article aims at giving you practical ways in which you can improve your codebases using FP style programming.

### What is FP?
It's an alternative way to the more classic Imperative Programming which dominates the market. Usual descriptions of FP are highlighting its "mathematical" aspect and never fail to mention quickly Category Theory, Algebraic data types, Monads and other scary names. Without a basic understanding of many of those concepts, writing a program in one of the strict functional languages (Haskell, Lisp, Elm, etc.) is a difficult task. In practice, FP offers predictability and strong abstractions at the cost of efficiency.

As always in this blog, we're using JavaScript has the base language. Although not a "real" functional language, JavaScript offers a lot of features to write a program using an FP style. We will focus on this article on how to get quickly the best of FP with the cheapest cognitive load.

#### Write more pure functions

Pure functions are the bread-and-butter of FP. A function is pure when given the same input, it produces the same output and performs no side effects. Coupling the output with the input forbids to use things like randomness, closures or current date in our pure function. What are "side effects"?
 Mutating the input is considered a crime
 Mutating an internal state is very bad
 Triggering external actions (logging, performing an I/O action) is bad to very bad

Pure functions are easy to understand as there is no dark magic happening anywhere. Nothing else has to be considered but the input and the output. Using and reusing the function again can be done with confidence that nothing is going to be affected anywhere in the program. Tests for pure functions should never need any stubbing mechanism, making them very simple to write and maintain. This is of course very suitable for Test Driven Development (the practice of writing tests before implementation).

All frameworks are compatibles with pure functions and all codebases will benefit from using them. You can start with small utility functions or extract parts of a big function. This practice will naturally grow into your codebase. You will be naturally tempted at some point to reuse and share those small functions in other parts of the code. Please resist a bit from doing so at first; more on this later in this post.

Writing code using more pure functions is very easy to do and will provide great benefits for your code. This is the single best improvement that FP can bring to a codebase.

#### Replace manual loops

FP provides a new set of algorithmics primitives to replace progressively imperative operators such as `for`, `if` or `try-catch`. They favor strongly readability and safety while fitting perfectly in your new pure functions. Let's go through the most useful of them by finding a replacement for our loops. Array.prototype already implements all these functions so we will use it as an example, but the concept works with all kinds of iterables.

##### Filter

One of the most common operations to perform is to loop in a list, to find/remove elements that match some criteria. All of these operations can be reduced to a simple name: filtering. A filter uses two inputs: a list (very often an Array but not necessarily) and a predicate. The predicate is a function (pure of course) that takes an item of the list as input and returns a boolean. Because our filter is pure, it must not mutate the original list but return a new filtered list. The items themselves can be cloned (expensive) or more probably are just referenced (fast) in the new list. The last point would be critical in terms of API with impure code mutating the items, but since we stayed away from impurity, we're safe.

Here is how Filter will improve the readability of your code. If you see a filter keyword somewhere, you can immediately:
- be sure that there will never be an index error that is classic with for loops.
- guess the API of the predicate function, without even looking at a type definition or its code.
- assume that no other data transformation has been performed.
- assume that input has not been mutated
- finally, you can skip to the next line because you know what the output will be: a new list of same type items, filtered by some condition that can be usually guessed looking at the name of the predicate.

##### Map

The map function is strange at first. It seems less powerful than a `for` and yet it is one of the most widely used FP primitive.
It applies on a list an iteratee function (pure of course) that transform each item into something else. The output list is kept in the same order.

With Map, again, you will improve your code readability:
- like with filter, no index error is possible.
- like with filter, nothing should have been mutated.
- you know that the size and order of your list are the same.
- the API of the iteratee will determine what will be the type of your output list.

The map function has also some longer-term potentials due to its mathematical properties that we will not address here. It's a solid foundation for your codebases.

##### Reduce

This is the swiss knife of FP. It would probably be worth a full article about how to use (and many people have done so), but the truth is that I use Reduce quite rarely and probably so should you. Here are the important things to do know with reduce:
- Reduce is the operation of transforming a list into a value. That value can be another list, a single number or anything else.
- You should expect purity from code in a reduce.
- Its best use is to build other tools (sum, group by, etc.). You can do almost anything with it.
- The second best use is to encapsulate complex imperative (pure) code. This is handy when addressing performance.
- It improves code readability by highlighting that a pure special operation is performed here. By providing a good name to the iteratee, it can be pretty fantastic to read.

##### ForEach

Some closing words on forEach. It looks like a Map but it returns undefined. The only thing that can, therefore, be done with it is performing side effects (mutations, network calls, logging, etc.). All programs have to deal at some point with side effects and with all our purity oriented refactorings, we have pushed mutation in some very specific places. They are harder to test but their scope has been shrunk, making them more manageable.

- If you see a forEach, that should trigger a purity alert. An interesting property to mention here is that a pure function can only use pure functions. The stain of impurity propagates upward and therefore a function executing a forEach is impure.
- There are other advanced ways to manage side effects in FP but this would bring us to some scary FP words.

##### Basic building tools

By using tools like map, filter and reduce, you will be creating a vocabulary for you and your teammates that can help you talking about code and decompose algorithms into simple elements. Describing a feature that has a combination of these FP keywords will be a rich and powerful experience. Let's take an example:
In order to send a newsletter to users that have accepted it. It's easy to describe the requirement as filtering users that want the newsletter and map them to their emails that we will use to send the newsletter. This is how this would be translated in FP style JavaScript: `userList.filter(isUserInterestedByNewsletter).map(getEmailFromUser).forEach(sendNewletterByEmail)`. It is at the same time readable in plain English, robust and gives very strong indications about the API of each step.

Many other tools can be explored. They almost always have the same characteristics: they are very generic, pure and easy to combine.

Using these FP building blocks will improve a lot the readability and maintainability of your codebases. 

#### Naming and API is more important than implementation

My last Functional Programming advice for this blog post is to improve naming conventions for functions. It's amazing at how pretty much all of the books and online resources repeat this over and over and yet this is one my first comments when reading code.

Here are some basic rules about function naming:
- it should use a verb to tell us what it will do.
- it should have a meaning aligned with the business context of your function.
- it should use the same word for the same concept everywhere.
- it should do only one thing.
- it should not describe how it is implemented.
- it should be maintained over time.
- if you have trouble naming the function, then its scope is probably incorrect.

An interesting tip that you can use to improve function naming is using aliases. Now let us play a bit with function naming while revisiting some previous items.

```javascript
 // Classic data scientist coding style. With a comment on top if you are lucky.
 const result = [];
 for (const e of a) {
 result.push(x(e)[0]);
 }

 // Improved version that use a basic building block and better names.
 const takeFirst = list => list[0]; // takeFirst is a great FP base tool (also known as head)
 const bestSchoolStudentList =
 classList
 .map(getStudentListSortedByAscendingRank)
 .map(head);

 // Improved version that aliases the base building block into a business oriented name
 const takeBest = takeFirst //takeFirst is imported from your toolkit.
 const bestSchoolStudentList =
 classList
 .map(getStudentListSortedByAscendingRank)
 .map(takeBest);

 // Bonus version using a new functional tool and map's associative properties
 // pipe(a,b) is equivalent to (...args) => b(a(...args)).
 const takeBestStudent = pipe(getStudentListSortedByAscendingRank, takeFirst);
 const bestSchoolStudentList =
 classList
 .map(takeBestStudent)
```