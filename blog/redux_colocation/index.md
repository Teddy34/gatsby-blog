---
date: "2020-07-20"
title: "Redux Selector colocation in practice"
category: "War stories"
tags: ['redux', 'javascript', 'WebDev']
banner: "/assets/bg/pointe-saint-matthieu.jpg"
---



### My current Redux project

I've been wanting to write about Redux for some time now. My first take with this pattern was probably at around the end of 2015 and I still love it. 

This blog post is written with my current use case in mind. The biggest application I'm working on has at this time:
* 68 reducers files
* 237 action definition
* 318 exported base selectors (using one state slice)
* 74 exported derived selectors (using several slices)
* a small number of UI specific selectors
* 132 usages of the reselect library

Even if the application is not of a monster size, this is not of the complexity of a demo todo app where any state management solution can shine. To use Redux at this scale, we had to make decisions about how we would structure, consume, and test our state management code. Overall, we are having an excellent time with Redux. Today I will focus on our experience with state tree splitting and colocating selectors and reducers.

### Automatic base selector forwarding

State tree splitting is probably the norm in most Redux Applications and I am a big fan of the concept. A single reducer file handling all potential actions can be quite difficult to write and test. The most common way to organize reducers' structure is by assigning them only a slice of the state and giving them full responsibility for it.

Having small modules with small responsibilities feels good. It's also easier to test. Finally, I like the ability to reset the children to their default state from the parent. When we adopted Redux in my current project, we immediately went for tree splitting. While the reducing of actions is clearer with state splitting, we quickly highlighted some issues regarding data access.

Reading data from the state can be performed by simply accessing the state tree and navigate through its property. While this works at small scales, the lack of encapsulation will become quickly problematic. Indeed, refactoring the state structure with this data access method can lead to updating a ton of UI components. This can be avoided using dedicated pure functions to read the state is a great way to hide the state structure and provide a caching mechanism. In the Redux world, they are called Selectors. Selectors seem to solve the issue for the component knowledge but the API of the selector remains unclear. Should it take the global state or the reducer's slice of the state?

The first option groups all the path problems in the selector but doesn't solve them. It also creates an asymmetry between the selectors and the reducers' structure. If the local state structure for a reducer is changed, all the selectors relying on it must be updated. Worse: without a type system, it might be difficult to detect which selectors need a review and the unit tests will probably not be able to catch it.

The second option is called reducer/selector colocation. Selectors working with the local slice of the state are fantastic. The reducer/selectors module is atomic and does not leak the state structure as all selectors affected by changes to the state structure are just next to their slice. The colocation of selectors with matching slices of the state is an excellent choice to avoid refactoring nightmares. But this solution has a big issue: the input for those reducer-file bound selectors is the local slice of the state, not the global one anymore. 

Randy Coulman discussed the problem in [a series of great blog posts](https://randycoulman.com/blog/2016/09/20/redux-reducer-selector-asymmetry/). Our team shared with Randy the view is that, as final consumers of the state are global objects (UI tree and actions), the final API of selectors should always use the global state as input.
This makes the global selector API efficient and simple: `globalState => value`. That also enables very strong reusability with reselect selector composition.

At the time of his analysis, Randy settled on an approach to forward all selectors to the parent reducer performing the combineReducer operation. The forward operation is pretty simple: the reducer using combineReducer knows all its children reducers and the allocated slice of the state. It's just a matter of exposing new selectors accessing the correct slice and applying the local selector exposed by the reducer. The approach can cascade up to the root reducer. It's much easier to refactor a local reducer file because as long as your local selectors are fine, you know that your whole application is fine. This is giving us the best of both worlds: colocation of reducers and selector while having the global state as input.

We arrived at the same conclusion and this felt great for a while. The forwarding of selectors remained annoying. At each node split, we needed to forward up all selectors with the correct path, resulting in additional boilerplate as we navigate toward the root reducer. When the problem became painful enough we used a small tool and pattern to help us along the way. We created a small pipeSelectors function that would map all selectors with a getter wired to the state node name:

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

Each reducer exposes selectors that work with its local state node, at all levels of the reducer tree. The logic is the same up to the root reducer that exposes a version of every collocated selector taking the global state as the argument instead of the local state slice. This scales well horizontally and vertically and can be tested at every level. Adding selectors or moving complete slices of the state to another node is easy and risk-free.

There is however one detail to improve. With our current implementation, if two selectors are sharing the same name, this results in a conflict and one of them will be overwritten. This brings us to an important question: should we use the same name between local reducers and forwarding ones? We quickly settled to use the same to avoid mistakes. It also forced us to not have two selectors with the same name in the whole application which resulted in... solving our first issue by using better names for selectors. Using global selector names with a global state is not so shocking after all.

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

This colocation & forwarding approach, with those few tools, made our base selectors very easy to write, use, and maintain. We call selectors exposed in this way on the root reducer "base" selectors as they are pointing at only one slice of the state.

### Derived selectors using composition
The second classic issue with colocation is related to selectors needing different slices of the state to compute a derived value. Those selectors have a coupling to the shape of a state node parent for all needed slices, which feels bad. A mitigation strategy would be to define correct responsibilities for the slices to use only one slice for the selector. Grouping too much the slices would defeat the slicing purpose. Anyway, at some point, the problem will arise again and no rearranging will solve the issue.

Ideally, we would want those selectors to know as little as possible of the state structure. A good way to achieve that is to access any simple or derived value through other selectors (colocated or not). This fits particularly well with the selector forwarding mechanism that we described earlier. This is also a perfect match for the reselect library. This library allows us to compose selectors to build new selectors.

```
  import { createSelector } from 'reselect';

  // selectorA and selectorB both take the same state (or slice) as input and produce a value
  import { selectorA, selectorB } from './root_reducer';

  // This function uses the result of other selectors and produce a new value. It's NOT a selector.
  const composeSelectorsResults = (a, b) => a + b);

  // createSelector usage produces a selector function taking the same input as selectorA and selectorB
  export const getAPlusB = createSelector([
    selectorA,
    selectorB,
  ], composeSelectorsResults);


  // getAPlusB(state) is equivalent to composeSelectorResults(selectorA(state), selectorB(state))
  // As getAPlusB is a selector, it can be part of another selector composition in the same way.
```

This technique is used to write all our derived selectors and some of our base selectors (inside the same reducer file). We had a short hesitation during the tests between mocking a selector's dependency (more unit test minded) or feeding the whole state (more integration test-like), but decided in the end for the second solution.

Since selectors are in the wonderful world of pure functions, the same inputs will provide the same output, making it easy to cache. This is embedded by default by Reselect. All our expensive state computations are encapsulated in a createSelector for this reason. This feature is the key that makes our state performant when consuming it.

### Conclusion

To summarize, all of our base selectors benefit at the same time from the encapsulation of the colocation technique and can be used using the global state as input. They are a foundation to build an additional layer of derived selectors which is also agnostic of the state structure.

The combination of our automatic base selector forwarding and composition to produce derived selector allowed us to go from a couple of state slices to a respectable number without headaches. It's still easy today to reshape our state tree by dividing or merging slices.

Redux has an often exaggerated reputation of complexity, but in the experience of our team, it has helped us instead to manage complexity in our growing applications. I hope to cover in future posts some other successes of our story with Redux and propose a solid mental framework to see how simple its architecture is when done right.
