---
date: "2020-05-10"
title: "AngularJS Migration War Story"
category: "War stories"
tags: ['React', 'AngularJS', 'Refactoring']
banner: "/assets/bg/pointe-sable-maurice2.jpg"
---

### Killing in the MEAN

I recently came across these [tweets](https://twitter.com/acemarke/status/1258854094904705026) from Mark Erikson (main maintainer of Redux).

> I just got assigned to a project with a classic MEAN AngularJS 1.x codebase.
> Coming _from_ React, it's frightening. "Controllers", "services", "providers", "scopes", weird template binding syntax, and bizarre source-regex-based dependency injection behavior.
> I'm expert enough to recognize the intent behind some of this architectural stuff, and I see similarities to how UI logic works in other frameworks.
> But conceptually, everything about this codebase freaks me out.
> It also doesn't help that it's using Bower / IIFEs / no actual bundling / plain JS, when I'm used to Yarn / ESM / proper dev and prod bundling / TS catching my mistakes.
> Which is why the first thing I did was convert it to build with CRA :)

I recognized a stack that was almost the same as one that I migrated a few years ago. Although this now feels distant to me, I read somewhere that software engineering projects that hit production have a median lifetime of seven years, this means that many other codebases will be migrated or rewritten from scratch in the years to come. I hope that this story will help people along the way.

### Initial stack (September 2016)

The company I recently joined had a strong history with AngularJS. We started the project using an internal bootstrap containing:
* AngularJS 1.5 as the base framework.
* Angular Material for the UI lib.
* Bower as FE package manager.
* [IIFE](https://developer.mozilla.org/en-US/docs/Glossary/IIFE) as primitive module system, concatenated by Gulp.
* NodeJS 0.12 as build environment.
* EcmaScript 5 language specification.
* Plus many other features out of the scope of this article.

Even though AngularJS was not the freshest framework to work with, this bootstrap enabled us to deliver a close to production level product by the end of week two. After years spent on six months release trains, this felt magical.

The most immediate pains of this stack were the JavaScript language limitations. Having used the ES6 and beyond on other projects, it was hard to go years backward. Although some features are more cosmetic than we might think, this had severe impacts on the complexity and readability of our codebase. This could soon become a showstopper preventing us to recruit as well.

We did not have plans to migrate at that time. We just wanted to improve our stack while shipping features. All of our improvements would have to be atomic and spread over time without breaking the product. This is quite different from a big refactoring project where everything stops until it is finished. The time we lost building intermediate temporary solutions was compensated by the excellent risk management of this incremental process and the roadmap continuity.

### Adopting Redux architecture (March 2017)

As the app grew in complexity, the AngularJS data binding quickly showed its limits (performance and long tree traversals). The team looked for alternatives and decided to adopt a Redux architecture. As the package was not available on Bower and the base logic behind the Redux library was small, we temporarily reimplemented it using a few lines of RxJS. A team member pushed for the usage of a `mapStateToThis` function to replicate the `mapStateToProps` of React-Redux. After all, AngularJS is fine with mutations. By going away from the AngularJS data binding, we had to be more careful not to miss a digest cycle.

One important impact of the Redux architecture was the code quality improvement. The separation of concerns between Action Creators, Reducers, and UI components made our unit tests more focused and valuable. The pure functions that Redux promotes made tests easier to write. A component controller became only a bit of plumbing between Redux, an HTML template, and some utility functions.

I remember being very supportive of the change. I liked Redux (and I still do), it was going in a more functional direction and more importantly, it was breaking the AngularJS monolith.

### Build system upgrades (June & October 2017)

After a lot of time spent in analysis and politics, we finally managed to update our NodeJS version. The 0.12 was completely obsolete and fewer libraries were supporting it every day. A key point of this migration is noteworthy in our context. The different engineering teams were using a shared Continuous Integration server resulting in everyone being locked to the same version for each building tool. So basically the NodeJS version was set by the oldest legacy component that we still might have to build in the whole company. We solved it by Dockerizing our build processes to be completely agnostic about the CI server build tools.

NodeJS 8 enabled many new tools in our stack. The build system could now use most ES6 features. To use ES6 in our application code, we still needed Babel to transpile our code to target browsers. Some other details like linters were in our way. Instead of investing more in Gulp, the team decided to adopt the build system standard: Webpack. You may notice that Mark's tweet mentioned his plan of using Create React App to perform that step. This was not our option back then. CRA was just out of beta and at that time we had specificities that diverged from the CRA defaults. I would love to go down that road today.

To focus on the build system rather than the application code improvement, we did not add Babel in the first iteration. Our linter, JSHint had trouble with ES6 syntax. This could wait a bit. Meanwhile, we discarded our JSCSRC formatter in favor of Prettier. This was one of the biggest quality of life improvement I ever saw in a codebase. In an isolated commit affecting 100% of our lines of code, we removed the IIFE module system that became unnecessary.

With Webpack came CommonJS and our first dependency tree not maintained by AngularJS. Our modules were now exporting the AngularJS module and component names, which means that those tokens could be imported in other modules and used in AngularJS Dependency Injection. That saved hours of reading long error logs because of a typo in the string tokens.

Webpack also killed our need for Bower. NPM replaced the legacy FE package manager and suddenly the list of libraries available for our project increased dramatically. This meant that we had access to the real Redux instead of our RxJS placeholder implementation. Soon after, a welcomed Pull Request was opened about it. The team could now use some of the powers of the Redux Dev Tools.

With a final touch in October, we added Babel and replaced JSHint by ESLint. This enabled ES6 in the codebase. After one year of suffering using ES5, I could again write code the way I liked it.

### Removing the AngularJS module system (January 2018)

AngularJS module system is built over the Dependency Injection principle. Its declarative approach removed the classic problem of dependency order (remember that our Gulp build system just concatenated all files). It was now already replaced by Webpack.

The other benefit of DI is to allow an easy swap between different module implementations which is critical for unit testing in Object Oriented. Half of our state management (Reducers and Selectors) was only using pure functions that were easy to test without any need for mocking or module swap. It was obvious at this stage that the AngularJS module system for those files was now more in the way rather than helping. We were already writing our pure utility functions in CommonJS modules outside the scope of AngularJS. We started to remove from the AngularJS module system all files that did not have a dependency on an AngularJS module. By January 2018, all of our Reducer and Selector files were simple CommonJS modules.

At this stage, the course was set to reduce the AngularJS usage to our UI components only to keep our options open. We continued to extract all pure logic to utility files and Redux state management but a key element blocked the migration of our Redux Action Creators and AngularJS services. AngularJS relies on the concept of a digest cycle to track the conditions to re-rendering the UI components. To identify the end of asynchronous events that should lead to a digest cycle, all those events must be wrapped by the framework. This is why, in AngularJS, we have to use `$http` instead of `fetch`, `$q`instead of ES Promises, `$timeout` instead of `setTimeout` and trigger manually digest cycles after callbacks. Otherwise, the framework has no way of knowing when to trigger a digest cycle after those asynchronous events.

Since we moved all our state management and data flow to Redux, the synchronization point to trigger digest cycles had already been shifted mainly to Action Creators. In February 2018, we removed all the `$<foo>` usage and coupled our Redux store to the digest cycle in the main application controller using something like this:

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

From now on, no one had to care about the digest cycle anymore. The AngularJS footprint was quickly reduced during normal development work. On top of that, Redux time travel was now working!

I was finally happy about writing some AngularJS code. It was down to a single responsibility that it performed pretty well: build & update presentational UI components.

### Saying goodbye to AngularJS (May - October 2018)

In January 2018, Google announced that AngularJS was entering its end of life phase. It would be harder and harder from now on to have updates on our UI libs. We decided to find a replacement and the team settled on React. We started the migration in May 2018.

At this stage, our AngularJS usage was limited to the UI components. We took the same approach as we did everywhere else: start from the leaves of the dependency tree and migrate a component when it has no more AngularJS dependency. This fitted very well with React as it could handle several independent component trees. As React's Material main implementation (Material UI) was pretty advanced, we could perform a progressive migration without much effort by replacing Angular-Material components by Material-UI ones.

The migration could not be performed in a single run. Like every other change in our journey, we worked by small increments. Any new component was written in React and everyone migrated a small chunk of components while shipping features. To migrate a component, a dev had to:
* Remove its angular module system.
* Convert the component template to JSX; adding necessary Material UI components in the CommonJS dependencies.
* Migrate the `mapStateToThis` to the `mapStateToProp` (same thing fo `mapDispatchToProps`).
* Use a small Angular to React connector in the parent component.

This also meant that we would live for some time with two frameworks plus their UI libraries running concurrently. As our business case could afford big bundles, this was not a problem. 

The different stakeholders of the project saw the React migration making progress on their dashboards without noticing any significant visual difference in the product. The number of concurrent React tree nodes grew to maybe five or six, before reducing again as we were migrating their parent components. New developers joined the team without ever touching one line of AngularJS code. One day in October 2018, the last PR removed AngularJS from the project in fifteen lines.

### Taking care of our stack and our teammates

Mark Erikson's tweet was an answer to Tom Dale asking this question:
> What were thing about Angular 1 that made people prefer React?

In our experience, each time we decoupled a responsibility from AngularJS, our codebase became simpler and gained more freedom.

The journey took some time but every single step was worth it. We kept delivering Release Candidates every week without playing with the nerves of our Product Owner. Each time a PR was merged, the quality of life for the dev team increased. Everyone, Juniors to Seniors, played a part.
