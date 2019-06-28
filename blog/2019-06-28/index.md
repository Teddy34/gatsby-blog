---
date: "2019-06-28"
title: "Clean up your code branches with cond"
category: "Code Utilities"
tags: ['Lodash', 'FP']
banner: "/assets/bg/4.jpg"
---
### Those nasty branches
Have you already coded or debugged 2000 lines of if/then/else with crazy unreadable conditions? Have you raged at the moment your nice switch statement didn't scaled because you needed to add an if statement in one of the case?

Well, looks like Lodash can AGAIN help you.

### About Lodash
Lodash is utility library used in a huge number of teams and is over 20M downloads per week at this moment. It provides a ton of small and powerfull algorithmic tools to avoid developpers to reimplement (often badly) the same logic all over again.

Furthermore it's also drive people to embrace a more functional programming style. There's a ton of reading about the benefits of FP in JavaScript and I'm not going to redo the same thing as countless medium articles by explaining how map/reduce/filter can help clean an improve your codebase. Once embraced, it's hard not to go too far on the FP bandwagon and harass your coworkers with Monads all day long.
If you haven't read those, please do (some links below) and don't come back here until you understand what is a pure function and the basic FP tooling like filter, map or reduce.

By using heavily the FP variant of Lodash in my team, we try to be on a sweet spot between classic imperative programming and too aggressive FP libs that require more theorical knowledge, resulting in difficult recruitement and longer onboarding. The benefit of the FP variant will be addressed hopefully in another blogpost.

### Cond is a switch statement on steroïds

Today we're going to focus on a little known but super powerfull Lodash function: cond.

You can think of cond as a super if, a switch statement on steroïds, or as the FP universe would call it an entry to Pattern Matching which might be added to JavaScript language itself soon (https://github.com/tc39/proposal-pattern-matching).


Please take 30 seconds to read the [Lodash documentation](https://lodash.com/docs/4.17.11#cond "It's short, read it really") and let's continue.

Are we good? Ok let's see the usage. cond works with a list of predicate/functions pairs. for the first truthy predicate, it calls the function with the same arguments and return the result, simple.

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

So far it looks a lot like a switch statement that is doing more than defining a control flow for different values of a variable. Another look at it could be a series of if then else all sharing the same API, in a more compact way.
It should already ring a bell that using the same arguments for the predicate and the function has a lot of potential. 

Let's move now to a problem solving example using cond. It's time for my first ever FizzBuzz exercise (true story). As I avoided for too long the infamous tech interview exercise, we will implement three times the FizzBuzz using suble variations of cond usage.

Let's define first a list of predicates and execution functions. See how easy it is to write unit tests for those because of their API and purity.

```js
const isMultipleOf3 = input => (input % 3) === 0;
const isMultipleOf5 = input => (input % 5) === 0;
const isMultipleOf5And3 = input => isMultipleOf3(input) && isMultipleOf5(input);

const outputFizz = () => "Fizz"; // _.constant("Fizz")
const outputBuzz = () => "Buzz";
const outputFizzBuzz = () => "FizzBuzz"; 
const otherwise = () => true; //_.stubTrue
const outputNumber = number => number // _.identity 
```

Please note the naming strategy. In this first implementation we are trying to describe in plain english the conditions associated with each output. In this specific case, this is describing strongly the implementation. This works great until the conditions are too complex to be explained in a short readable function name. The isMultipleOf5And3 is hinting at the limit. If you work enough on business names for your functions you won't encounter the problem that much. The inability to find a business name for a case is a warning light. perhaps your case is not correct.

```js
const fizzBuzz1 = _.cond([
	[isMultipleOf5And3, outputFizzBuzz],
	[isMultipleOf3, outputFizz],
	[isMultipleOf5, outputBuzz],
	[otherwise, outputNumber ]
]);

const first100Number = _.range(1,101);
first100Numbers.map(fizzBuzz1).forEach(value => console.log(value));
```

Boom it reads nicely doesn't it?

Our FizzBuzz1 leverages nicely the first truthy => first executed pair. This is often great but at scale, it creates an integration risk when the link between the predicate and its mate is not strong enough. In FizzBuzz1, the [isMultipleOf3, outputFizz] pair only work because isMultipleOf5And3 case is handled above.

In order to solve this problem, we will work on FizzBuzz2. By adding more business responsability to the name of the predicate we are making sure that their implementation force decoupling between the case.

```js
const shouldFireFizzBuzz = input => isMultipleOf3(input) && isMultipleOf5(input);
const shouldFireFizz = input => isMultipleOf3(input) && !isMultipleOf5(input); 
// Bonus: const isNotMultipleOf5 = _.negate(isMultipleOf5);
const shouldFireBuzz = input => isMultipleOf5(input) && !isMultipleOf3(input);
const shouldReturnInput = input => !isMultipleOf5(input) && !isMultipleOf3(input);
```

The order of the pairs doesn't matter anymore as all predicates are mutually exclusives. Please note that there's no more need for a default handling (otherwise). Pattern matching implementation often differ about whether handling default is a good or bad thing. Lodash is flexible and you can treat the default case as an error if you want.

```js
const fizzBuzz2 = _.cond([
	[shouldFireFizzBuzz, outputFizzBuzz],
	[shouldFireFizz, outputFizz],
	[shouldFireBuzz, outputBuzz],
	[shouldReturnInput, outputNumber ]
]);
```

Let's point free the console.log, we're using only the first argument. Most of the time in FP thinking we love unaries. This is one of the reason why the FP variant with currying and different argument order is more powerful. Please note that our cond study works with both variant.

```js
const logIt = _.unary(console.log)
first100Numbers.map(fizzBuzz2).forEach(logIt);
```

One of the nice thing with cond is because of the common API, it's easy to compose cond together. The FizzBuzz3 example will explore the possibility of nesting conds to allow more complex control flows to split into different concerns.

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

As we can see all the branches of our nested cond are testable independently. It's interesting to see that some branches of our control flow arrive to the same outputFizzBuzz function. Very often when using if then else, we DRY things too much only to see our nice DRYed code explode after a requirement change. This is not going to happen here.

Let's get a bit fancier with the execution using lodash/FP. It's basically the same as before.
```js
const fizzBuzzImplementationArg = _.placeholder

testFizzBuzzImplementation = flow(
	_.map(fizzBuzzImplementationArg, first100Numbers),
	_.forEach(logIt);
)

testFizzBuzzImplementation (fizzBuzz3 );
```

Ok I've done enough FizzBuzz for the rest of my life. To conclude this article with cond, I would like to show an example about how much function naming can help implementing requirements by staying very close to the description of your requirements.

Let's take an example with the chooseAColor function. Assume that you don't know the specs, you don't know the input and output data structures and you know that all functions are unit tested. How hard it is to understand what this code does?

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
	[isItSummer, chooseBetweenSummerColors],
	[isItWinter, chooseBetweenWinterColors],
	[otherwiseMidSeason, chooseBlue],
]);
```

This illustrates how FP can improve significantly a codebase without going through complicated abstract code. This style focus a lot on what we are trying to achieve and less on the how, relegating implication as a detail.


