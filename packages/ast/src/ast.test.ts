import ast, { fromJSON } from "./ast";
import _fuzz from "@fuzz-utils/fuzz";

const defaultContext = {
  withTypes: false,
  prefix: "fuzz",
  fuzzReturnType: "FuzzerReturnType",
  fuzzerType: "Fuzz"
};

// used by `eval`
const fuzz = _fuzz;

test("creating a fuzzer is the same as evaluating it from a string", () => {
  const seed = Math.floor(Math.random() * 1e9);

  const result = ast.object([
    ["a", ast.string()],
    ["b", ast.array(ast.boolean())],
    ["c", ast.tuple([ast.object([["d", ast.float()]])])],
    ["d", ast.nullable(ast.string())],
    ["e", ast.array(ast.oneOf([ast.return("a"), ast.return("b"), ast.return("c")]).maybe())]
  ]);

  const fuzzer1 = result.toFuzz();
  const [rose1] = fuzzer1.toRandomRoseTree().sample({ seed });

  const fuzzer2 = eval(result.toString(defaultContext));
  const [rose2] = fuzzer2.toRandomRoseTree().sample({ seed });

  const fuzzer3 = fromJSON(result.toJSON()).toFuzz();
  const [rose3] = fuzzer3.toRandomRoseTree().sample({ seed });

  expect(rose1.value()).toEqual(rose2.value());
  expect(rose1.value()).toEqual(rose3.value());
});

test("grabs references", () => {
  const result = ast.object([["otherThing", ast.reference("OtherThing")]]);

  const str1 = result.toString(defaultContext);
  const str2 = fromJSON(result.toJSON()).toString(defaultContext);

  expect(str1).toEqual(str2);
  expect(str1).toEqual(`fuzz.object({ "otherThing": fuzz.lazy(() => OtherThing) })`);
});

test("transforms to type definitions", () => {
  const result = ast.object([
    ["a", ast.string()],
    ["b", ast.array(ast.boolean())],
    ["c", ast.reference("User")],
    ["d", ast.nullable(ast.string())],
    ["e", ast.array(ast.oneOf([ast.return("a"), ast.return("b"), ast.return("c")]).maybe())],
    ["f", ast.tuple<boolean | number>([ast.boolean(), ast.float(), ast.number()])]
  ]);

  expect(result.toType(defaultContext)).toEqual(
    `{ "a": string, "b": (boolean)[], "c": ${
      defaultContext.fuzzReturnType
    }<User>, "d": (string) | null, "e": (("a" | "b" | "c") | undefined)[], "f": [boolean, number, number] }`
  );

  expect(result.toString({ ...defaultContext, withTypes: true })).toEqual(
    `${defaultContext.prefix}.object<{ "a": string, "b": (boolean)[], "c": ${
      defaultContext.fuzzReturnType
    }<User>, "d": (string) | null, "e": (("a" | "b" | "c") | undefined)[], "f": [boolean, number, number] }>({ "a": ${
      defaultContext.prefix
    }.string(), "b": ${defaultContext.prefix}.array<boolean>(${
      defaultContext.prefix
    }.boolean()), "c": ${defaultContext.prefix}.lazy(() => User), "d": ${
      defaultContext.prefix
    }.string().nullable(), "e": ${defaultContext.prefix}.array<("a" | "b" | "c") | undefined>(${
      defaultContext.prefix
    }.oneOf([${defaultContext.prefix}.return("a"), ${defaultContext.prefix}.return("b"), ${
      defaultContext.prefix
    }.return("c")]).maybe()), "f": ${defaultContext.prefix}.tuple<[boolean, number, number]>([${
      defaultContext.prefix
    }.boolean(), ${defaultContext.prefix}.float(), ${defaultContext.prefix}.number()]) })`
  );
});
