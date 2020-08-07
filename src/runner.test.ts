import fuzz from "./fuzz";
import { Runner } from "./runner";

const string = fuzz.string();
const object = fuzz.object({
  age: fuzz.posInteger(),
});
const runner = Runner.from([string, object]);

it("runs tests", async () => {
  // this will always fail because it will quickly run into a short string
  const result = await runner.run(
    (value, obj) => {
      expect("age" in obj).toBeTruthy();
      expect(value.length).toBeGreaterThanOrEqual(5);
    },
    { count: 50 }
  );

  // the run failed
  expect(result.failure.length).toBeGreaterThan(0);

  // the first failing case was a string with less than 5 characters
  const failure = result.failure[0];
  expect(failure.data.args.length).toBeLessThan(5);
});

it("can be used as a runner", () => runner.run((value) => expect(value.length).toBeGreaterThanOrEqual(5)));
