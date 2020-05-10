---
date: "2020-05-10"
title: "AngularJS migration war story"
category: "War stories"
tags: ['React', 'AngularJS', 'Refactoring']
banner: "/assets/bg/pointe-sable-maurice2.jpg"
---

### Killing in the MEAN

I have recently come to these [tweets](https://twitter.com/acemarke/status/1258854094904705026) from Mark Erikson (main maintainer of Redux).

> I just got assigned to a project with a classic MEAN AngularJS 1.x codebase.
> Coming _from_ React, it's frightening. "Controllers", "services", "providers", "scopes", weird template binding syntax, and bizarre source-regex-based dependency injection behavior.
> I'm expert enough to recognize the intent behind some of this architectural stuff, and I see similarities to how UI logic works in other frameworks.
> But conceptually, everything about this codebase freaks me out.
> It also doesn't help that it's using Bower / IIFEs / no actual bundling / plain JS, when I'm used to Yarn / ESM / proper dev and prod bundling / TS catching my mistakes.
> Which is why the first thing I did was convert it to build with CRA :)

I recognized almost exactly a stack that I migrated a few years ago. I've read somewhere that software engineering projects hitting production have a median lifetime of over 7 years. This means that even if this feels distant to me, still many other codebases will be migrated or rewritten from scratch in the years to come. I hope that this guide will help some people along the way.

### Initial stack (September 2016)

The company I recently joined had a strong history with AngularJS. We started the project using an internal bootstrap containing:
* AngularJS 1.5 as the base framework
* Angular Material for the UI lib
* Bower as FE package manager
* [IIFE](https://developer.mozilla.org/en-US/docs/Glossary/IIFE) as primitive module system, concatenated by Gulp.
* NodeJS 0.12 as build environment
* EcmaScript 5 language specification
* Plus many other features out of the scope of this article.

Even though AngularJS was not the freshest framework to work with, this bootstrap enabled us to deliver a close to production level product by the end of week 2. After years spent on 6 months release trains, this felt magical.

The most immediate pains of this stack were the JavaScript language limitations. Having used the ES6 and beyond on other projects, it was hard to go years backward. Although some features are more cosmetic than we might think, this had severe impacts on the complexity and readability of our codebase. This also could become soon a showstopper preventing us to recruit as well. Many of us would refuse to join this kind of projects today.

Meanwhile, we had features to ship. All of our changes would have to be atomic and spread over time without breaking the product. This is quite different from a big refactoring project where everything stops until it is finished. The time we lost building intermediate temporary solutions was compensated by the excellent risk management of this incremental process and the continuity of the roadmap.

### Adopting Redux architecture (March 2017)

As the app grew in complexity, the AngularJS data-binding showed quickly its limits (performance and long tree traversals). The team looked for alternatives and decided to adopt a Redux architecture. As the package was not available on Bower and the base logic behind the Redux library is small, we reimplemented it temporarily using few lines of RxJS. A team member pushed for the usage of a `mapStateToThis` function to replicate the mapStateToProps of React-Redux. This was a brutal mutation of the AngularJS component controller but this helped later. After all, AngularJS is fine with mutations. By going away from the AngularJS data binding, we had to be more careful about not missing a digest cycle.

One important impact of the Redux architecture was the code quality improvement. The separation of concern between action creators, reducers, and components made our unit tests more focused and valuable. The pure functions that Redux forces us to use made the test easier to write. A component controller became only a bit of plumbing between redux, HTML template, and some utility functions.

I remember being very supportive of the change. I liked Redux (and I still do), it was going in a more functional direction and more importantly, it was breaking the AngularJS monolith.

### Build system upgrades (June & October 2017)

After a lot of time spent in analysis and politics, we finally managed to update our NodeJS version. The 0.12 was completely obsolete and fewer libraries were supporting it every day. A key point of this migration is noteworthy in our context. The different engineering teams were using a shared Continuous Integration server resulting in everyone being locked to the same version for each building tool. So basically the NodeJS version was set by the oldest legacy component that we still might have to build in the whole company. We solved it by extending our Docker usage to the build processes. Other teams migrated to the same pattern.

NodeJS 8 enabled many new tools in our stack. The build system could use most ES6 features but not our application code yet. We needed Babel to transpile to our target browsers and other details like linters were in our way. Instead of investing more in Gulp, the team decided to adopt the build system standard: Webpack. You may notice that Mark's tweet in the introduction mentioned his plan of using Create React App to perform that step. This was not our option back then. CRA was just out of beta and at that time and we wanted to avoid too many changes at once in the code. I would love to go that road today.

To focus on the build system rather than the application code improvement, we did not add Babel in the first iteration. I also remember that our linter, JSHint had trouble with ES6 syntax. This could wait a bit. Meanwhile, we discarded our JSCSRC formatter in favor of Prettier. This was one of the biggest quality of life improvement I ever saw in a codebase. In an isolated commit affecting 100% of our lines of code, we removed the IIFE module system that became unnecessary.

With Webpack came CommonJS and our first dependency tree not maintained by AngularJS. Our modules were now exporting the AngularJS module and component names, which means that those tokens could be imported in other modules and used in AngularJS Dependency Injection. That saved hours of reading long error logs because of a typo in the string tokens.

Webpack also killed our Bower usage. NPM replaced the legacy FE package manager and suddenly the list of libraries available for our project exploded. This meant that we had access to Redux instead of our RxJS placeholder implementation. We didn't wait for long until a Pull Request was opened about it. The team could now use some of the powers of the Redux Dev Tools.

With a final touch in October, we added Babel and replaced JSHint by ESLint. This enabled ES6 in the codebase. After one year of suffering using ES5, I could again write code the way I liked it.

### Removing the AngularJS module system.

AngularJS module system is built over the Dependency Injection principle. Its declarative approach removed the classic problem of dependency order (remember that our Gulp build system just concatenated all files). The dependency order was now already solved in another way by Webpack.

The other benefit of DI is to allow an easy swap between different module implementation which is critical for unit testing in Object Oriented. [This quality is subject to debate](https://medium.com/javascript-scene/mocking-is-a-code-smell-944a70c90a6a). Half of our state management (reducers and selectors) were already completely pure functions that were easy to test without any need for mocking or module swap. It was obvious at this stage that the AngularJS module system was now more in the way rather than helping. Small pure utility functions were already written and imported without the overhead of our old module system. We quickly removed Angular from all files that didn't have a dependency over an angular feature. By January 2018, all of our reducer & selector structure was agnostic of AngularJS. It looked like simple CommonJS modules. 

At this stage, the course was set to reduce the AngularJS usage to our UI components only to keep our options open. We continued to extract all pure logic to util files & redux state management but a key element blocked the migration of our redux Action creators and AngularJS services. AngularJS relies on the concept of a digest cycle to track the conditions to re-rendering the UI components. To track the asynchronous events that should lead to a digest cycle, all those events should be wrapped by an AngularJS. This is why we have to use `$http` instead of `fetch`, `$q`instead of ES Promises, `$timeout` instead of `setTimeout` and from time to time, trigger manually a digest cycle using `$apply` or `$digest`.

Since we moved all our state management and data flow to Redux, the synchronization point to trigger digest cycles had already been shifted mainly to action creators. In February 2018, we removed all the $tools usage and coupled our Redux store to digest cycle in the main application controller using something like this:

```
function initStore($rootScope, store) {
  // Triggers a throttled digest cycle after each store update.
  store.subscribe(
    throttle(() => $rootScope.$apply(() => {}), {
      leading: false,
      trailing: true
    })
  );
}

```

From now on, no one had to care about the digest cycle anymore. The AngularJS footprint was quickly reduced during normal development work. On top of that, we had a new dev feature available: Redux time travel was now working!

I was finally happy about writing some AngularJS code. It was down to a single responsibility that it did pretty well: build & update presentational UI components. This may seem trivial today with our modern frameworks, but people who worked with Dojo, Jquery, YUI, and other frameworks of the 2005-2015 era probably understand this value.

### Saying goodbye to AngularJS

In January 2018, Google announced that AngularJS was entering its end of life phase. It would be harder and harder from now on to have updates on our UI libs. It was already hard to motivate developers to work on a deprecated framework and recruiting would be more challenging. We decided to find a replacement and the team settled on React. We started the migration in May 2018.

At this stage, our AngularJS footprint was limited to the UI components. We took the same approach as we did everywhere else: start from the leaves of the dependency tree and migrate a component when it has no more AngularJS dependency. This fitted very well with React that could handle several independent component trees.
As React's Material main implementation (Material UI) was pretty advanced, we could perform a progressive migration without much effort by replacing Angular-Material components by Material-UI ones.

The migration could not be performed in a single run. Like every other change in our journey, we worked by small increments. Any new component was written in React and everyone migrated a small chunk of components while shipping features. To migrate a component, a dev had to:
* Remove the angular module. It should not have any remaining dependency.
* Integrate the component template in JSX, adding necessary Material UI components in the CommonJS dependencies.
* Migrate the mapStateToThis to the mapStateToProp (same thing fo mapDispatchToProps).

This also meant that we would live for some time with two frameworks plus their UI lib running concurrently. As our business case could afford big bundles, this was not a problem. 

The different stakeholders of the project saw the React migration making progress on their dashboards without noticing any significant visual difference in the product. The number of concurrent React tree nodes grew to maybe 5 or 6, before reducing again as we were migrating their parent components. New developers joined the team without ever touching one line of AngularJS code. One day in October 2018, the last PR removed AngularJS from the project in 15 lines.

### Conclusion: decoupling is great

The journey took some time but every single piece of it was worth it. We kept delivering Release Candidates every week without playing with the nerves of our Product Owner. Each time a PR was merged, the quality of life for the dev team increased. Everyone, Juniors to Seniors, played a part.

Mark Erikson tweet was an answer to Tom Dale asking this question:
> What were thing about Angular 1 that made people prefer React?

Each time we decoupled a responsibility from AngularJS, we made our codebase simpler and gained more freedom.
