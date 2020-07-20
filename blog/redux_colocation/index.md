---
date: "2020-07-20"
title: "Redux Selector colocation"
category: "War stories"
tags: ['redux', 'javascript', 'WebDev']
banner: "/assets/bg/pointe-saint-matthieu.jpg"
---

I am a big fan of the state tree splitting concept. Having small modules with smaller responsibilities feels good. It's also easier to test. Finally, I like the ability to reset the children to their default state from the parent. When we adopted Redux in my current project, we immediately went for tree splitting. It's probably the norm in Redux applications.

While the reducing of actions is clearer with state splitting, we quickly highlighted some issues regarding data access.

With state splitting, we had to take into consideration the path to the slice we wanted to read from and the reducer file did not know anything about it (nor should). This is especially bad for UI components to know about the state structure. Using dedicated pure functions to read the state is a great way to hide the state structure and provide caching mechanism. In the Redux world, they are called Selectors. Selectors seem to solve the issue for the component knowledge but the API of the selector remains unclear. Should it take the global state or the reducer's slice of the state?

The first solution groups all the path problems in the selector but doesn't solve it. It also creates an asymetry between the selectors and the reducers structure. If the local state structure for a reducer is changed, all the selectors relying on it must be updated. Worse: without a type system, it might be difficult to detect which selectors needs a review and the unit tests will probably not be able to catch it.

The second solution is called reducer/selector colocation. Selectors working with the local slice of the state are fantastic. The reducer/selectors module is atomic and does not leak the internal slice structure as all selectors affected by changes to the state structure are just next to the slice. Colocation of selectors with matching slices of the state is an excellent choice to avoid refactoring nightmares. But this solution has a first issue: the input for those reducer-file binded selectors is the local slice of the state, not the global one anymore. 

Randy Coulman highlighted the problem in a great blogpost and pointed that as final consummers of the state are global objects (UI tree and actions), the final API of selectors should always use the gobal state as input.
This makes the selector API efficient and simple : globalState => value. That enables a very strong reusability with reselect selector composition.

At the time of his analysis, Randy settled on an approach to forward all selectors to the parent reducer performing the combineReducer operation. The forward operation is pretty simple: the reducer using combineReducer knows all its children reducers and the allocated slice of state. It's just a matter of exposing new selectors accessing the correct slice and applying the local selector exposed by the reducer. The approach can cascade up to the root reducer. It's much easier to refactor a local reducer file because as long as your local selectors are fine, you know that your whole application is fine.

The forwarding of selectors remained annoying. At each node split, we needed to forward up all selectors with the correct path, resulting in a more and more boilerplate as we navigate toward the root reducer. When the problem became painful enough we used a small tool and pattern to help us along the way. We created a small pipeSelectors function that would map all selectors with a getter wired to the state node name:

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

If any selector name is duplicated, it would throw at application initialization time.

// Composition of selectors
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
