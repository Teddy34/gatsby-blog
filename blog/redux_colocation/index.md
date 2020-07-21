---
date: "2020-07-20"
title: "Redux Selector colocation in practice"
category: "War stories"
tags: ['redux', 'javascript', 'WebDev']
banner: "/assets/bg/pointe-saint-matthieu.jpg"
---

### My current Redux project

I've been wanting to write about Redux for some time now. My first take with its pattern was probably at around the end of 2015 and I still love it. 

This blog post is written with my current use case in mind. The biggest application I'm working on has at this time:
* 68 reducers files
* 237 action definition
* 318 exposed base selectors (using one state slice)
* 74 exposed derived selectors (using several slices)
* a small number of UI specific selectors
* 132 usages of the reselect library

Overall, we are having an excellent time with it. A previous blog post explains how it has helped us moving from AngularJS to React. Today I will focus on our experience with state tree splitting and colocating selectors and reducers.

### State tree splitting

State tree splitting is probably the norm in most Redux Applications. A single reducer file handling all potential actions can be quite difficult to write and test. The most common way to organize reducer's structure is by assigning them only a slice of the state and giving them full responsability over it.

I am a big fan of the state tree splitting concept. Having small modules with small responsibilities feels good. It's also easier to test. Finally, I like the ability to reset the children to their default state from the parent. When we adopted Redux in my current project, we immediately went for tree splitting. While the reducing of actions is clearer with state splitting, we quickly highlighted some issues regarding data access.

Reading data from the state can be performed by simply accessing the state tree and navigate through its property. While this works at small scales, the lack of encapsulation will become quickly problematic. Indeed, refactoring the state structure with this data access method can lead to udpating a ton of UI components. Using dedicated pure functions to read the state is a great way to hide the state structure and provide caching mechanism. In the Redux world, they are called Selectors. Selectors seem to solve the issue for the component knowledge but the API of the selector remains unclear. Should it take the global state or the reducer's slice of the state?

The first option groups all the path problems in the selector but doesn't solve them. It also creates an asymetry between the selectors and the reducers structure. If the local state structure for a reducer is changed, all the selectors relying on it must be updated. Worse: without a type system, it might be difficult to detect which selectors needs a review and the unit tests will probably not be able to catch it.

The second option is called reducer/selector colocation. Selectors working with the local slice of the state are fantastic. The reducer/selectors module is atomic and does not leak the state structure as all selectors affected by changes to the state structure are just next to their slice. Colocation of selectors with matching slices of the state is an excellent choice to avoid refactoring nightmares. But this solution has a first issue: the input for those reducer-file binded selectors is the local slice of the state, not the global one anymore. 

Randy Coulman highlighted the problem in [a great blogpost](https://randycoulman.com/blog/2016/09/20/redux-reducer-selector-asymmetry/) and pointed that as final consummers of the state are global objects (UI tree and actions), the final API of selectors should always use the gobal state as input.
This makes the selector API efficient and simple : `globalState => value`. That also enables a very strong reusability with reselect selector composition.

At the time of his analysis, Randy settled on an approach to forward all selectors to the parent reducer performing the combineReducer operation. The forward operation is pretty simple: the reducer using combineReducer knows all its children reducers and the allocated slice of state. It's just a matter of exposing new selectors accessing the correct slice and applying the local selector exposed by the reducer. The approach can cascade up to the root reducer. It's much easier to refactor a local reducer file because as long as your local selectors are fine, you know that your whole application is fine. This is giving us best of both worlds: colocation of reducers and selector while having the global state as input.

We arrived to the same conclusion and this felt great for a while. The forwarding of selectors remained annoying. At each node split, we needed to forward up all selectors with the correct path, resulting in additional boilerplate as we navigate toward the root reducer. When the problem became painful enough we used a small tool and pattern to help us along the way. We created a small pipeSelectors function that would map all selectors with a getter wired to the state node name:

```
import { flow, get, mapValues } from 'lodash/fp';
import { combineReducers } from 'redux';

import { firstReducer, ...firstSelectors } from './reducer_file_1';
import { secondReducer, ...secondSelectors } from './reducer_file_2';

const pipeSelectors = (key, selectorList) =>
		mapValues((selector) => flow(get(key), selector), selectorList);

	const firstStateNodeKey = 'firstStateNode';
	const secondStateNodeKey = 'secondStateNode';

	const routedFirstSelectors = pipeSelectors(firstStateNodeKey, firstSelectors);
	const routedSecondSelectors = pipeSelectors(secondStateNodeKey, secondSelectors);

	const reducer = combineReducers({
		[firstStateNodeKey]: firstReducer,
		[secondStateNodeKey]: secondReducer,
	});

	export default {
		reducer,
		...routedFirstSelectors,
		...routedSecondSelectors,
	};
```

Each reducer exposes selectors that work with its local state node, at all levels of the reducer tree. The logic is the same up to the root reducer that exposes a version of every collocated selector taking the global state as argument instead of the local state slice. This scales well horizontally and vertically and can be tested at every level. Adding selectors or moving complete slices of the state to another node is easy and risk free.

There is however one detail to improve. With our current implementation, if two selectors are sharing the same name, this results in a conflict and one of them will be overwriten. This bring us to an important question: should we use the same name between local reducers and forwarding ones? We quickly settled to use exactly the same to avoid mistakes. It also forced us to not have two selectors with the same name in the whole application which resulted in... solving our first issue by using better names for selectors. Using global selector names with a global state is not so shocking after all.

The decision was enforced by another utility function:

```
const getListOfSharedSelectorNames = flow(
	map(keys),
	flatten,
	groupBy(identity),
	filter((group) => group.length > 1),
	values,
	flatten,
	uniq
);

export const safeMergeSelectors = (selectorGroupList) => {
	const listOfSharedSelectorNames = getListOfSharedSelectorNames(
		selectorGroupList
	);
	if (listOfSharedSelectorNames.length > 0) {
		throw new Error(
		`Couldn't combine selectors due to having multiple selectors with identical name:
		${listOfSharedSelectorNames.join()}`
		);
	}
		return assignAll(selectorGroupList);
	};

// usage
export default {
	reducer,
	safeMergeSelectors([
		pipeSelectors(firstStateNodeKey, firstSelectors),
		pipeSelectors(secondStateNodeKey, secondSelectors),
	]);
}
```

If any selector name is duplicated, it would throw at application initialization time. A limitation of the approach is that it's not possible to use the same reducer at different places in the state tree. I don't think that this is desirable anyway.

### Composition of selectors
The second classic issue with colocation is related to selectors needing different slices of the state to compute a derived value. Those selectors need to know the shape of a state node parent for all needed slices. A mitigation strategy would be to define correct responsabilities for the slices in order to use only one slice for the selector. Grouping too much the slices would defeat the slicing purpose. Anyway at some point the problem will arise again and no rearranging will solve the issue.

Ideally, we would want those selectors to know as little as possible of the state structure. A good way to achieve that is to access any simple or derived value through other selectors (colocated or not). This fit particulary well the selector forwarding mechanism that we described earlier. This is also a perfect match for the reselect library. This library allows to compose selectors to build new selectors with caching capabilities.

```
	import { createSelector } from 'reselect';

	// selectorA and selector B both take the same state (or slice) as input and produce a value
	import { selectorA, selectorB } from './root_reducer';

	// This function uses the result of other selectors and produce a new value. It's NOT a selector
	const composeSelectorResults = (a, b) => a + b);

	// createSelector usage produces a selector function taking the same input as selectorA and selectorB
	export const getAPlusB = createSelector([
		selectorA,
		selectorB,
	], composeSelectorResults;


	// getAPlusB(state) is equivalent to composeSelectorResults(selectorA(state), selectorB(state))
	// getAPlusB can be part of a selector composition again in the same way.
```
