import fuzz from "./fuzz";
import { Runner } from "./runner";

it("runs tests", async () => {
  const fuzzer = fuzz.string();
  const runner = new Runner(fuzzer);

  // this will always fail because it will quickly run into a short string
  const result = await runner.run((value) => {
    expect(value.length).toBeGreaterThan(5);
  });

  // the run failed
  expect(result.failure.length).toBeGreaterThan(0);

  // the first failing case was a string with less than 5 characters
  const failure = result.failure[0];
  expect(failure.data.args.length).toBeLessThan(5);
});
