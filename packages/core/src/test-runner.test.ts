import { test, expect } from "vitest";
import { fuzz } from "./fuzz";
import { TestRunner } from "./test-runner";

const string = fuzz.string();
const object = fuzz.object({
  age: fuzz.posInteger(),
});

test("runs tests", async () => {
  const runner = TestRunner.from([string, object], (str, obj) => {
    expect("age" in obj).toBeTruthy();
    expect(str.length).toBeGreaterThanOrEqual(5);
  });

  // this will always fail because it will quickly run into a short string
  const result = await runner.run({ count: 50 });

  const failure = result.smallestFailure;

  if (failure) {
    expect(failure.args[0]).toHaveLength(0); // smallest failure is always going to be the empty string
  } else {
    expect(false).toBeTruthy(); // guard
  }
});

test("can be used as a runner", () => {
  const runner = TestRunner.from([string, object], (value) => expect(value.length).toBeGreaterThanOrEqual(5));
  runner.run({ count: 50 });
});
