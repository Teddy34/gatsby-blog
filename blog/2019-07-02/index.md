---
date: "2019-06-28"
title: "Moving out of legacy"
category: "War Stories"
tags: ['Code Migration', 'AngularJS', 'RxJS', 'docker']
banner: "/assets/bg/pointe-sable-maurice2.jpg"
---

### Dealing with technical debt and keep delivering.

Everyone wants to go fast. My first project at Riaktr had such ambitions. Leveraging our internal application boilerplate, we managed to ship our first iteration of the product on week 1. Sprint after sprint, the team managed to keep a high velocity but sooner or later we had to face the issue of dealing with our own legacy.

This story is about how we tackled our technical debt, while keeping the flow of features. Some details have of course been simplified to keep the story short.

### Initial setup. The good, the bad and the ugly

#### A depreciating app boilerplate

We bootstrapped the project with an angularjs framework built with gulp. Angular was not yet out and React was starting its success story and so as such, therefore our AngularJS was still an acceptable option. Still with new frameworks rising and the perspective of and end of support of AngularJS (which has materialized since), the situation was not entirely comfortable. An old framework is not only technical risk. Just try recruiting motivated software developpers today to work on AngularJS or Backbone...

The boilerplate was flexible enough so that we could update early on all angular dependencies to latest version. The binding system worked fine for a while, until the application grew in complexity and forwarding binding changes messed with our mental sanity. Oh and by the way, that was also my first real AngularJS project.

Without babel in the build system, we were limited to a rapidly limiting ES5 version of my favorite programming language. Furthermore the package manager was Bower. Bower was not yet dead at that time, but npm had already won the war. The package manager would hurt us along the way

#### The center of the web: the CI server

The problem with shared components accross projects is that you often end up with a dependency on things that no one have the time to update. Furthermore, you have to keep your old projects running so breaking changes are your ennemies.

In our case, the centerpiece of our dependencies materialized in the Continous Integration server. It had the responsability of building all companies project and was therefore running a very old version of Node-JS, mandatory for some project out of our control, so mandatory for all projects.

#### Piece of modernity: Docker

The company was an early adopter of Docker. At the time of my arrival, the solution was becoming mature and the team had a lot of knowledge about it. The list of benefits for using Docker is too long for now, but in the context of this blog post, this was an incredible tool that would help us decoupling the different components and projects. In practice, this meant that production and development were running in containers. The build was outputing docker images artifacts.

#### Time allocation

Going fast does not mean that there's no place for infrastructure & technical work. From the start of the project, the team had a 10 to 15% of our work capacity to be allocated to technical tasks. The aim was to let the team in control about upgrading the infrastructure, tooling and to explore new technologies.
Not that many project managers understand the value of this and it's also hard to use wisely.

### Pain driven methodology.

As I said before, the team started the 

#### leverage the docker pattern to decouple from CI env

#### update node.js version 0.12 => 8

#### introduction of Redux pattern using RxJS

#### migration to webpack / killing of bower / commonjs

### replacement of RxJS by redux

### conclusions





