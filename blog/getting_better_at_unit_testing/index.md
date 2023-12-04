---
date: "2019-09-14"
title: "Getting better at unit testing"
category: "War stories"
tags: ['FP', 'tests', 'TDD']
banner: "/assets/bg/monkeys.jpg"
---

# Unit tests and me

I discovered unit testing in 2003, under the guidance of a [great tech lead](https://www.linkedin.com/in/bernard-roubaud-8246b33/). I understood the value, but the execution was a challenge for the young developer that I was. I did not see the practice in the teams that I joined later on until recently. I was still a firm believer in unit tests, but it was hard for me to find the correct way to implement them and convince colleagues to get into it. The turning point for me was the [Survival Guide for Legacy Code talk in EVE Online Fanfest 2015](https://www.youtube.com/watch?v=JCR9q1MMO2E&pp=ygUWZXZlIG9ubGluZSBsZWdhY3kgY29kZQ%3D%3D). A tl;dr version of the talk could be a quote from Micheal Feathers: "Legacy Code is code without tests". It took me a couple of years of practice, but I finally reached a point where I could reach high coverage in my codebases with high support from the team. I hope that these few lines will help you get there faster than me.

# Are unit tests worth it?

While we were taught to test and automate code during our academic journey, the real-world scenario often diverges. The reality is that across the industry, the level of unit testing is very low. Worse, when I push for more unit testing, I get resistance, especially from devs. It's a constant of most projects that I joined.The usual culprits in this resistance include:

- I do not have the time for it (number one excuse).
- Tests are expensive or complex to design and write.
- Framework or previous tests are broken for a long time.
- Our old tests are bad. We do not know what we are testing.
- It's easier to understand the feature by reading the code.
- Too little test surface results in no value.
- Too extensive test surface results in high cost.
- Tests are expensive to maintain.
- It's not my responsibility (ouch).

There is overall little value perceived for the effort given. On the contrary, most people who do Test Driven Development usually claim that by doing it right, we can save value by writing tests first. From my experience, the skepticism towards these claims can be attributed, in large part, to low-quality unit test writing.

So what can we do to increase the value of tests and reduce their costs?

# Let's focus first on reducing the costs

## 1) People are not used to writing tests

The remedy to this challenge is straightforward: write tests more frequently. One effective way to facilitate this process is by adopting established patterns. One such pattern is the "Arrange Act Assert" pattern, which structures tests into three distinct parts.

In the "Arrange" phase, conditions for the test are set up. The "Act" phase concentrates solely on executing the code, while the "Assert" phase defines the success and failure conditions for the test. Embracing this habit encourages developers to resist the temptation of making tests overly complex. Furthermore, it enhances the readability of tests, benefiting the next person who reviews or works with the code.

```
describe('AppCenterUtils', () => {
  describe('extractLatestPublicVersionId(releases)', () => {
    it('should return the latest version id', () => {
      //arrange
      const releases = [
        {
          destinations: [
            {
              name: 'All users',
            },
          ],
          id: '1',
          uploaded_at: '2021-01-01',
        },
        {
          destinations: [
            {
              name: 'All users',
            },
          ],
          id: '2',
          uploaded_at: '2021-01-02',
        },
        {
          destinations: [
            {
              name: 'All users',
            },
          ],
          id: '3',
          uploaded_at: '2021-01-03',
        },
      ];

      //act
      const latestVersionId = extractLatestPublicVersionId(releases);

      //assert
      expect(latestVersionId).toEqual('3');
    });
  });
});
```

The other key of effective test writing lies in developing a deep understanding of what proves challenging to test. Armed with this knowledge, one can proactively address the following section.

## 2) Code complexity

Writing a lot of tests should result naturally prompts developers to reevaluate their coding practices.

It becomes evident that certain aspects pose challenges to testing, such as asynchronous behaviors, intricate internal states, complex dependencies, and heavy branching logic. Ironically, the most intricate and fragile code segments tend to be the ones initially exempted from testing. This paradox highlights the need for a shift in approach, emphasizing comprehensive testing for the most complex components.


Simplifying the testing process involves leveraging a powerful tool from the arsenal of Functional Programming: the adoption of pure functions. As outlined in detail in the blog post (https://codingwithjs.rocks/blog/fp-the-good-parts), pure functions play a crucial role in simplifying code structure and enhancing testability.

By extracting business logic and focusing extensive testing efforts on pure functions, you set a high coverage target for these components. In contrast, for impure code sections, a lower coverage target suffices. This approach not only streamlines the testing process but also promotes code clarity and maintainability.

Strategies such as minimizing the number of arguments, reducing cyclomatic complexity, and eliminating for loops with their associated counters contribute significantly to code simplicity.

By embracing pattern matching, as explored in the blog post (https://codingwithjs.rocks/blog/better-branching-with-lodash-cond), you can effectively streamline branching logic, making code more readable and less prone to errors.

The act of writing code with testability in mind not only benefits the test developers but, more importantly, elevates the overall code quality. As you delve deeper into this approach, it prompts a natural questioning of function requirements, fostering a continuous cycle of refinement and improvement.

## 3) Complexity of the expected behavior.

The tendency for functions to accumulate numerous arguments often stems from attempting to address too many concerns within a single function. This applies similarly to an abundance of branches or a convoluted mix of asynchronous behaviors. Addressing this issue requires a proactive approach of challenging and, if necessary, redefining the requirements.

Breaking down problems into smaller, more manageable chunks and ensuring proper testing of each component becomes pivotal. This approach extends to considering the naming conventions for functions and classes. If defining test cases becomes arduous, it's a signal that the scope may need a different framing.

With gained test-writing experience, coupled with a concerted effort to reduce code and requirement complexity, many of the challenges encountered thus far should be mitigated. However, as we navigate forward, there are a few additional considerations to factor in.

## 4) Designing test scenarios is expensive.

The challenge of high unit test costs also extends to the design of the tests themselves. Defining the scope of tests requires careful consideration: Should simple getters be tested? Is it necessary to cover every branch of a complex decision tree? There's a potential risk of introducing more complexity and maintenance overhead in the tests than in the code they are meant to validate.

Once again, Test Driven Development (TDD) steps in as a valuable ally. By focusing on essential test cases and only testing what is truly necessary, you can avoid unnecessary complexities. If proving the importance of all 64 branches in your code is crucial, an extensive test strategy holds significant value, especially for guarding against regressions or supporting future refactorings. However, if certain branches hold no value, don't hesitate to skip them in your tests.

Furthermore, engaging in thoughtful test design might lead to a realization that the actual code implementation can be significantly simplified. This iterative process of refining test design and code implementation can bring about both improved test efficiency and a more streamlined codebase.

That impact of the test on the actual implementation marks a good transition from cost to value.

# Improving the value of unit tests

While End-to-end or Acceptance tests rely on well-defined specifications, developers rarely get specifications for low-level functions or classes.  Over time, as modifications accumulate, understanding the full scope of a code snippet becomes a complex task. This challenge often leads to hesitation when it comes to code refactoring due to uncertainties about potential regression impacts.

Unit tests offer a practical solution—not just for validation but as a means to create a different kind of documentation: one that actively executes your code. They provide developers with the confidence to undertake refactoring efforts, fostering a culture of continuous improvement without the fear of unintended consequences.

When dealing with legacy code, a strategic approach to testing becomes a valuable asset. By thoughtfully creating tests that address known or desired use cases, you're not only validating behavior but also building tangible documentation. This proactive approach transforms legacy code from a puzzle into a manageable entity, making it more maintainable and aligning it with modern development standards.

By adhering to the solutions outlined to manage code and behaviour complexities, the intrinsic value of unit tests as a design tool becomes unmistakable. Using your tests to challenge your code architecture, rather than fitting forcefully tests into pre-existing architecture, fosters an environment conducive to better code quality.

A final noteworthy aspect centers around the enhancement of code reviews. In the typical landscape of pull requests, it's not uncommon to encounter code that appears a bit cryptic, demanding mental efforts to unravel its intended purpose and identify potential pitfalls. Unit tests, however, provide a welcome declaration of intent. By collapsing the test content and focusing solely on the test descriptions, a clear and tangible understanding of the code's behavior emerges. This not only expedites the code review process but elevates it to a more robust and insightful level.

 ```
describe('AppCenterUtils', () => {
  describe('extractLatestPublicVersionId(releases)', () => {
    it('should return the latest version id', () => {
    });

    it('should take into account All Users releases', () => {
    });

    it('should take into account Public releases', () => {
    });

    it('should ignore others releases', () => {
    });

    it('should throw an error if no release is found', () => {
    });
  });
});
```

Seeing a unit test like that allows me to focus on just a few possible mistakes in the code. The test's clarity, conveyed through concise descriptions, directs my attention to specific areas, making the review process more efficient and effective.

# Practical guide to improve your unit-tests

As a conclusion, let's summarise everything into a small guide about how to get better at unit testing:

- follow a test writing pattern like AAA.
- isolate your logic within (pure) functions. Prioritize extensive testing of these functions, deferring integration testing to a later stage. 
- find waysto reduce the number of mocks.
- only test the use cases that you need.
- use the tests to reflect on your code architeture.
- If you collapse all the test content, it should be understandable and helpful.



