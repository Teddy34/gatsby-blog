---
date: "2019-06-28"
title: "Better branching with Lodash _.cond"
category: "FP"
tags: ['FP', 'Lodash']
banner: "/assets/bg/pointe-sable-maurice2.jpg"
---
### Those nasty branches
Have you already coded 2000 lines of if/then/else with crazy unreadable conditions? Have you updated/debugged/refactored this code to always see a test fail? (you do have unit tests, don't you?) Have you raged at the moment your nice switch statement didn't scale because you needed to add if statements in your cases?

Well, looks like Lodash can AGAIN help you.

### About Lodash
Lodash is a utility library used in a huge number of teams and is over 20M downloads per week at this moment. It provides a ton of small and powerful algorithmic tools to avoid developers to reimplement (often badly) the same logic all over again.

Furthermore, it also drives people to embrace a more functional programming style. There're [many articles](https://medium.com/javascript-scene/master-the-javascript-interview-what-is-functional-programming-7f218c68b3a0 "Here is one") about the benefits of FP in JavaScript and I'm not going to redo the same thing as countless medium articles by explaining how map/reduce/filter can help clean and improve your codebase. Once embraced, it's hard not to go too far on the FP bandwagon and harass your coworkers with Monads all day long.
If you haven't read those, please do and don't come back here until you understand what is a pure function and the basic FP tooling like filter, map or reduce.

By using heavily the FP variant of Lodash in my team, we try to be in a sweet spot between classic imperative programming and too aggressive FP libs that require more theoretical knowledge, resulting in difficult recruitment and longer onboarding. The benefit of the FP variant will be addressed hopefully in another blog post.

### Cond is a switch statement on steroids

Today we're going to focus on a little known but super powerful Lodash function: cond.

You can think of cond as a super if or a switch on steroids. In the FP universe, we would call it an entry to Pattern Matching. Please note that the feature might be added to JavaScript language itself soon (https://github.com/tc39/proposal-pattern-matching).


Please take 30 seconds to read the [Lodash documentation](https://lodash.com/docs/4.17.11#cond "It's short, read it really") and let's continue.

Are we good? Ok, let's see the usage. cond works with a list of predicate/functions pairs. For the first truthy predicate, it calls the function with the same arguments and returns the result, simple.

```js
const predicate1 = aNumber => isEven( aNumber ) ? true: false;
const function1 = input => input + 1;

const predicate2 =  aNumber  => isOdd(aNumber  ) ? true: false;
const function2 =  input => input * 2;
const myFirstCond = cond([
    [predicate1 ,function1],
    [predicate2 ,function2]
]);

myFirstCond(13) // returns 26
myFirstCond(4) // returns 5
```

So far it looks a lot like a switch statement that is doing more than defining a control flow for the different values of a variable. Another look at it could be a series of if then else all sharing arguments, in a more compact way.
It should already ring a bell that using the same API for the predicates and the functions has a lot of potentials. 

### Use cases with FizzBuzz

Let's move now to a problem-solving example using cond. It's time for my first ever [FizzBuzz](http://wiki.c2.com/?FizzBuzzTest) exercise (true story). As I avoided for too long the infamous tech interview exercise, we will implement three times the FizzBuzz using subtle variations of cond usage.

#### Describe your business rules for maximum readability

Let's define first a list of predicates and execution functions. See how easy it is to write unit tests for those because of their API and purity.

```js
const isMultipleOf3 = input => (input % 3) === 0;
const isMultipleOf5 = input => (input % 5) === 0;
const isMultipleOf5And3 = input => isMultipleOf3(input) && isMultipleOf5(input);

const outputFizz = () => "Fizz"; // _.constant("Fizz")
const outputBuzz = () => "Buzz";
const outputFizzBuzz = () => "FizzBuzz"; 
const otherwise = () => true; // _.stubTrue
const outputNumber = number => number // _.identity 
```

Please note the naming strategy. In this first implementation, we are trying to describe in plain English the conditions associated with each output. In this specific case, this is describing strongly the implementation. This works great until the conditions are too complex to be explained in a short readable function name. The isMultipleOf5And3 is hinting at the limit. If you work enough on business names for your functions you won't encounter the problem that much. The inability to find a business name for a case is a warning light. perhaps your problem definition is not correct.

```js
const fizzBuzz1 = _.cond([
    [isMultipleOf5And3, outputFizzBuzz],
    [isMultipleOf3, outputFizz],
    [isMultipleOf5, outputBuzz],
    [otherwise, outputNumber ]
]);

const first100Numbers = _.range(1,101);
first100Numbers.map(fizzBuzz1).forEach(value => console.log(value));
```

Boom it reads nicely doesn't it?

Our FizzBuzz1 leverages nicely the first truthy => first executed pair. In that sense, the naming convention we used has the scope of the cond usage. That makes it very close to the FizzBuzz specification. This is often great but at scale, it creates an integration risk when the link between the predicate and its pair is not strong enough. In FizzBuzz1, the [isMultipleOf3, outputFizz] pair only works because the isMultipleOf5And3 case is handled above.

#### Scale by decoupling the predicates

In order to solve this problem, we will work on FizzBuzz2. By isolating and naming each business case, we can create tests and implementations that make sense alone. As a result, the predicate names are expressing fewer details about how they resolve the business question

```js
const shouldFireFizzBuzz = input => isMultipleOf3(input) && isMultipleOf5(input);
const shouldFireFizz = input => isMultipleOf3(input) && !isMultipleOf5(input); 
// Bonus: const isNotMultipleOf5 = _.negate(isMultipleOf5);
const shouldFireBuzz = input => isMultipleOf5(input) && !isMultipleOf3(input);
const shouldReturnInput = input => !isMultipleOf5(input) && !isMultipleOf3(input);
```

Again, you can see how easy to unit-test those functions are.

```js
const fizzBuzz2 = _.cond([
    [shouldFireFizzBuzz, outputFizzBuzz],
    [shouldFireFizz, outputFizz],
    [shouldFireBuzz, outputBuzz],
    [shouldReturnInput, outputNumber ]
]);
```

The order of the pairs doesn't matter anymore as all predicates are mutually exclusive. This naming convention offers more flexibility at the cost of removing a bit of readability about why do we choose one branch or the other (which was the key advantage in the first implementation)
Please note that there's no more need for a default handling (otherwise). Pattern matching implementations often differ about whether handling default is a good or bad thing. Lodash is flexible and you can treat the default case as an error if you want.

#### Handle nested branches with cond composition

One of the nice things with cond is because of the common API, it's easy to compose cond together. The FizzBuzz3 example will explore the possibility of nesting conds to allow more complex control flows to split into different concerns.

```js
const transformMultipleOf3 = _.cond([
    [isMultipleOf5, outputFizzBuzz],
    [otherwise, outputFizz]
]);

const transformMultipleOf5 = _.cond([
    [isMultipleOf3, outputFizzBuzz],
    [otherwise, outputBuzz]
]);

const fizzBuzz3 = _.cond([
    [isMultipleOf3, transformMultipleOf3],
    [isMultipleOf5, transformMultipleOf5],
    [otherwise, outputNumber ]
]);
```

As we can see all the branches of our nested cond are testable independently. It's interesting to see that some branches of our control flow arrive at the same outputFizzBuzz function. Very often when using if then else, we DRY things too much only to see our nice DRYed code explode after a requirement change. This is not going to happen here.

This also illustrates how easy it is to refactor code using this approach. We have been connecting together a bunch of very descriptive functions in all sorts of different ways without having to change their implementation.

### Requirement driven code organization

Ok, I've done enough FizzBuzz for the rest of my life. I would like to show now an example of how much function naming can help expressing requirements by staying very close to their description.
This results in code that is very easy to read and analyze. 

Let's take an example with the chooseAColor function. Assume that you don't know the specs, you don't know the input and output data structures and you know that all functions are unit tested. How hard is it to understand what this code does and how hard is it to spot the business integration mistake that I slipped into it?

```js
const chooseBetweenSummerColors = cond([
    [isItWarm, chooseWhite],
    [isItWindy, chooseGreen],
    [otherwise, chooseLeastUsedColor]
]);

const chooseBetweenWinterColors = cond([
    [isSkyBlue, chooseFirstColor],
    [isSnowOutside, chooseBlue],
    [otherwise, raiseError]
]);

const chooseAColor= cond([
    [isItSummer, chooseBetweenWinterColors],
    [isItWinter, chooseBetweenSummerColors],
    [otherwiseMidSeason, chooseBlue],
]);
```

Have you spotted the issue?

This illustrates how FP can improve significantly a codebase without going through some complicated abstract code. This style focuses a lot on what we are trying to achieve and less on the how, relegating implication as a detail.

### Fitting into a good code pattern.

The most important lesson here is not really about _.cond itself but more about how we split our implementation into smaller pieces with high decoupling and strong meaning. Cond is the generalization of a strong programming pattern (Pattern Matching) and writing our code in a way that fits the pattern results in higher quality code.

This is often a result of using a Functional Programming style. Instead of making super custom/DRYed imperative code that ties business & algorithm concerns, we split the responsibilities of business (isMultipleOf5, outputBuzz) from the algorithmic ones (map, filter, cond, reduce). By leveraging a functional toolbox like Lodash, we are simply fitting our implementation into classic strong programming patterns. This will probably be a recurrent topic in this blog.
### Conclusions

What have we learned so far with cond?

* By leveraging the same API for predicates & functions, the code is more flexible and easy to refactor or compose
* By isolating concerns into separate functions with good names, the code is more readable
* By using small pure functions, the code is more testable
* By fitting into programming patterns, we can reduce the complexity 

So after all, one might wonder if there's still a use case for if / switch / ternary operators and in all honesty, I still use them for small cases. As soon as it leaves the easy to read category, I usually refactor them into cond.
