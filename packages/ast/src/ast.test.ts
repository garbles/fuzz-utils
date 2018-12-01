import ast, { fromJSON } from "./ast";
import _fuzz from "@fuzz-utils/fuzz";

const fuzz = _fuzz;

test("creating a fuzzer is the same as evaluating it from a string", () => {
  const seed = Math.floor(Math.random() * 1e9);

  const result = ast.object({
    a: ast.string(),
    b: ast.array(ast.boolean()),
    c: ast.tuple([ast.object({ d: ast.float() })])
  });

  const fuzzer1 = result.toFuzz();
  const [rose1] = fuzzer1.toRandomRoseTree().sample({ seed });

  const fuzzer2 = eval(result.toString());
  const [rose2] = fuzzer2.toRandomRoseTree().sample({ seed });

  const fuzzer3 = fromJSON(result.toJSON());
  const [rose3] = fuzzer3
    .toFuzz()
    .toRandomRoseTree()
    .sample({ seed });

  expect(rose1.value()).toEqual(rose2.value());
  expect(rose1.value()).toEqual(rose3.value());
});
