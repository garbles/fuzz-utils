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

  const failure = result.smallestFailure;

  if (failure) {
    expect(failure.args[0]).toHaveLength(0); // smallest failure is always going to be the empty string
  } else {
    expect(false).toBeTruthy(); // guard
  }
});

it("can be used as a runner", () => runner.run((value) => expect(value.length).toBeGreaterThanOrEqual(5)));
