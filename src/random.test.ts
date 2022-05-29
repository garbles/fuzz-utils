import { random } from "./random";

test("same result will always generate the same integers", () => {
  const result = random.integer();

  const [a] = result.sample({ seed: 1 });
  const [b] = result.sample({ seed: 1 });

  expect(a).toEqual(b);
});

test("same result if the filter does not change the outcome", () => {
  const result = random.integer();

  const [a] = result.resize(10).sample({ seed: 1 });
  const [b] = result
    .resize(10)
    .filter((x) => x < 11)
    .sample({ seed: 1 });

  expect(a).toEqual(b);
});

test("different result if an appropriate result is used", () => {
  const result = random.integer();

  const [a] = result.filter((x) => x > 0).sample({ seed: 1 });
  const [b] = result.filter((x) => x === 0).sample({ seed: 1 });

  expect(a).not.toEqual(b);
  expect(b).toEqual(0);
});

test("allows you to set a maximum number of tries and throw when it isn't met", () => {
  const result = random.integer();
  const a = jest.fn((x) => x > 10);
  const b = jest.fn((x) => x > 10);

  expect(() => result.resize(10).filter(a).sample({ seed: 1e3 })).toThrow(new Error("Could not satisfy filter in 10000 tries."));

  expect(() => result.resize(10).filter(b, 10).sample({ seed: 1e3 })).toThrow(new Error("Could not satisfy filter in 10 tries."));

  expect(a).toHaveBeenCalledTimes(1e4);
  expect(b).toHaveBeenCalledTimes(10);
});

test("same result will always generate the same list of integers", () => {
  const result = random.array(random.integer());

  const [a] = result.sample({ seed: 1, maxSize: 10 });
  const [b] = result.sample({ seed: 1, maxSize: 10 });

  expect(a).toEqual(b);
});

test("creates a list of integers where all numbers are greater than 5", () => {
  const [value] = random
    .array(
      random
        .integer()
        .resize(10)
        .filter((x) => x > 5)
    )
    .sample({ seed: 1, maxSize: 40 });

  expect(value.length).toBeLessThanOrEqual(40);
  value.forEach((v) => expect(v).toBeGreaterThan(5));
});

test("create integers within a range", () => {
  for (let value of random.integerWithin(3, 7).toGenerator({ count: 50 })) {
    expect(value).toBeGreaterThanOrEqual(3);
    expect(value).toBeLessThanOrEqual(7);
  }
});

test("creates boolean values", () => {
  const [value] = random.array(random.boolean()).sample({ seed: 1 });
  value.forEach((v) => expect(typeof v).toEqual("boolean"));
});

test("creates character values", () => {
  const [valueA] = random.character().sample({ seed: 1 });

  expect(typeof valueA).toEqual("string");
  expect(valueA).toHaveLength(1);
});

test("creates string values", () => {
  const [value] = random
    .string()
    .resize(10)
    .filter((v) => v.length === 10)
    .sample({ seed: 1 });

  expect(typeof value).toEqual("string");
  expect(value).toHaveLength(10);
});

test("can map values", () => {
  const [value] = random
    .array(
      random
        .integer()
        .resize(10)
        .map((x) => x + 1)
    )
    .sample({ seed: 1, maxSize: 20 });

  value.forEach((v) => {
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(11);
  });
});

test("can map and filter values", () => {
  const [value] = random
    .array(
      random
        .integer()
        .resize(10)
        .map((x) => x + 1)
        .filter((x) => x === 5)
    )
    .resize(20)
    .filter((arr) => arr.length === 10)
    .sample({ seed: 1 });

  expect(value).toHaveLength(10);
  value.forEach((v) => expect(v).toEqual(5));
});

test("can bind to a different generator", () => {
  const int = random.integer();

  const [value] = int
    .bind((v) => {
      return random
        .string()
        .resize(v)
        .filter((s) => s.length === v);
    })
    .sample({ seed: 1e2 });

  expect(typeof value).toEqual("string");
  expect(value).toHaveLength(int.sample({ seed: 1e2 })[0]);
});

test("does not adopt the binding of the other generator", () => {
  const arrs = random
    .posInteger()
    .resize(100)
    .bind((v) => random.array(random.return(v)).resize(5).noEmpty())
    .toGenerator({ count: 50 });

  for (let arr of arrs) {
    expect(arr.length).toBeLessThanOrEqual(5);
    expect(arr.length).toBeGreaterThan(0);

    for (let value of arr) {
      expect(value).toBeLessThanOrEqual(100);
    }
  }
});

test("can assign frequency to results", () => {
  const freq = random.frequency([
    [1, random.return(1)],
    [1, random.return(2)],
    [1, random.return(3)],
    [1, random.return(4)],
    [10, random.return(0)],
  ]);

  const [arr] = random
    .array(freq)
    .resize(200)
    .filter((arr) => arr.length === 200)
    .sample({ seed: 1e3 });
  const zeros = arr.filter((x) => x === 0).length;

  // this could fail, but it's very unlikely
  expect(zeros).toBeGreaterThan(100);
});

test("can sample a list", () => {
  const sample = random.oneOf([1, 2, 3]);
  const [result] = random
    .array(sample)
    .resize(300)
    .filter((arr) => arr.length === 300)
    .sample({ seed: 1e3 });

  const ones = result.filter((x) => x === 1).length;
  const twos = result.filter((x) => x === 2).length;
  const threes = result.filter((x) => x === 3).length;

  expect(ones).toBeGreaterThan(80);
  expect(ones).toBeLessThan(120);
  expect(twos).toBeGreaterThan(80);
  expect(twos).toBeLessThan(120);
  expect(threes).toBeGreaterThan(80);
  expect(threes).toBeLessThan(120);
});

test("can make composite objects", () => {
  const obj = random.object({
    x: random.integer(),
    y: random.integer(),
  });

  const [a] = obj.sample({ seed: 1e2 });
  const [b] = obj.sample({ seed: 1e3 });
  const [c] = obj.sample({ seed: 1e3 });

  expect(Object.keys(a)).toEqual(Object.keys(b));
  expect(a).not.toEqual(b);
  expect(b).toEqual(c);
});

test("can make objects with plain values as keys", () => {
  const obj = random.object({
    x: random.integer(),
    y: 12,
  });

  const [a] = obj.sample({ seed: 1e2 });
  const [b] = obj.sample({ seed: 1e3 });

  expect(a.x).not.toEqual(b.x);
  expect(a.y).toEqual(b.y);
});

test("skips n values from the same seed", () => {
  const number = random.integer();

  const [a] = number.sample({ seed: 1e2 });
  const [b] = number.skip(1).sample({ seed: 1e2 });
  const [c] = number.skip(1).sample({ seed: 1e2 });
  const [d] = number.skip(2).sample({ seed: 1e2 });
  const [e] = number.skip(3).sample({ seed: 1e2 });
  const [f] = number.skip(3).sample({ seed: 1e2 });

  expect([b, c, d, e, f]).not.toContain(a);
  expect([b]).toContain(c);
  expect([d, e, f]).not.toContain(b);
  expect([e, f]).not.toContain(d);
  expect([e]).toContain(f);
});

test("memoizes the result so that they are not recomputed with the same seed", () => {
  const mapper = jest.fn<number, [number]>((x) => x + 1);
  const filterer = jest.fn((x) => x !== 0);
  const int = random.integer().map(mapper).map(mapper).filter(filterer).map(mapper).filter(filterer).map(mapper).filter(filterer).memoize();

  const [a] = int.sample({ seed: 1e2 });
  const [b] = int.sample({ seed: 1e2 });
  const [c] = int.sample({ seed: 1e2 });

  expect(a).toEqual(b);
  expect(a).toEqual(c);
  expect(mapper).toHaveBeenCalledTimes(4);
  expect(filterer).toHaveBeenCalledTimes(3);
});

test("keeps memoization even if chained again in a new context if the same seed is used", () => {
  const mapper = jest.fn<number, [number]>((x) => x + 1);
  const int = random.integer().map(mapper).memoize();

  int.sample({ seed: 1e3 });
  int.filter((x) => x > -1e5).sample({ seed: 1e3 });

  expect(mapper).toHaveBeenCalledTimes(1);
});

test("keeps memoization even if chained again in a new context unless a new seed is used", () => {
  const mapper = jest.fn<number, [number]>((x) => x + 1);
  const int = random.integer().map(mapper).memoize();

  int.sample({ seed: 1e3 });
  int.filter((x) => x > -1e5).sample({ seed: 1e4 });

  expect(mapper).toHaveBeenCalledTimes(2);
});

test("can turn off memoziation", () => {
  const mapper = jest.fn<number, [number]>((x) => x + 1);
  const filterer = jest.fn((x) => x !== 0);
  const int = random.integer().map(mapper).map(mapper).filter(filterer).map(mapper).filter(filterer).map(mapper).filter(filterer);

  const a = int.sample({ seed: 1e2 });
  const b = int.sample({ seed: 1e2 });
  const c = int.sample({ seed: 1e2 });

  expect(a).toEqual(b);
  expect(a).toEqual(c);
  expect(mapper).toHaveBeenCalledTimes(12);
  expect(filterer).toHaveBeenCalledTimes(9);
});

test("creates a tuple from other generators", () => {
  const tuple = random.tuple([random.integer(), random.string(), random.object({ hello: "world", thing: random.boolean() })]);

  const [a] = tuple.sample({ seed: 1e2 });

  expect(typeof a[0]).toEqual("number");
  expect(typeof a[1]).toEqual("string");
  expect(typeof a[2].hello).toEqual("string");
  expect(typeof a[2].thing).toEqual("boolean");
});

test("generates a list of values", () => {
  const numbers = random.integer().toGenerator({ seed: 1e5, count: 50 });

  for (let n of numbers) {
    expect(typeof n).toEqual("number");
  }
});

test("generates non empty values", () => {
  const numbers = random.integer().noEmpty().toGenerator({ seed: 1e5, count: 50 });

  const array = random.array(random.integer()).noEmpty().toGenerator({ seed: 1e5, count: 50 });

  for (let n of numbers) {
    expect(n).not.toEqual(0);
  }

  for (let arr of array) {
    expect(arr.length).toBeGreaterThan(0);
  }
});

test("generates nullable values", () => {
  const numbers = random.integer().nullable(4).toGenerator({ seed: Date.now(), count: 1000 });
  const expected = 1000 / 4;

  const nulls = [...numbers].filter((x) => x === null).length;

  expect(nulls).toBeGreaterThan(expected * 0.8);
  expect(nulls).toBeLessThan(expected * 1.2);
});

test("generates maybe values", () => {
  const numbers = random.integer().maybe(5).toGenerator({ seed: Date.now(), count: 1000 });
  const expected = 1000 / 5;
  const undef = [...numbers].filter((x) => x === undefined).length;

  expect(undef).toBeGreaterThan(expected * 0.8);
  expect(undef).toBeLessThan(expected * 1.2);
});

test("resizes generators", () => {
  const strings = random
    .posInteger()
    .resize(10)
    .map((i) => i.toString())
    .toGenerator({ count: 50 });

  for (let str of strings) {
    expect(parseInt(str, 10)).toBeLessThanOrEqual(10);
  }
});

test("generates empty values when maxSize is zero", () => {
  const [zero] = random.integer().sample({ maxSize: 0 });
  const [falze] = random.boolean().sample({ maxSize: 0 });
  const [emptyArr] = random.array(random.integer()).sample({ maxSize: 0 });
  const [emptyStr] = random.string().sample({ maxSize: 0 });

  const [emptyObj] = random
    .object({
      a: random.integer(),
      b: random.boolean(),
      c: random.array(random.integer()),
      d: random.string(),
    })
    .sample({ maxSize: 0 });

  expect(zero).toEqual(0);
  expect(falze).toEqual(false);
  expect(emptyArr).toEqual([]);
  expect(emptyStr).toEqual("");
  expect(emptyObj).toEqual({ a: 0, b: false, c: [], d: "" });
});

test("generates bytes", () => {
  const [byte] = random.byte().sample();

  expect(byte).toBeGreaterThanOrEqual(0);
  expect(byte).toBeLessThanOrEqual(255);
});

test("generates uuids", () => {
  const [uuid] = random.uuid().sample();

  expect(uuid).toHaveLength(36);
  expect(uuid[8]).toEqual("-");
  expect(uuid[13]).toEqual("-");
  expect(uuid[14]).toEqual("4");
  expect(uuid[18]).toEqual("-");
  expect(uuid[23]).toEqual("-");

  uuid
    .split("")
    .filter((char) => char !== "-")
    .forEach((char) => {
      expect(parseInt(char, 16)).toBeLessThanOrEqual(15);
      expect(parseInt(char, 16)).toBeGreaterThanOrEqual(0);
    });
});

test("generates an unbiased integer within a range", () => {
  const count = 1e3;
  const arr = random.integerWithin(0, 4).toGenerator({ count });

  const results = [...arr].reduce(
    (acc, num) => {
      return [
        acc[0] + Number(num === 0),
        acc[1] + Number(num === 1),
        acc[2] + Number(num === 2),
        acc[3] + Number(num === 3),
        acc[4] + Number(num === 4),
      ];
    },
    [0, 0, 0, 0, 0]
  );

  results.forEach((num) => {
    expect(num).toBeGreaterThanOrEqual((count / 5) * 0.8);
    expect(num).toBeLessThanOrEqual((count / 5) * 1.2);
  });
});

test("lazy evaluate code in a closure", () => {
  const gen = random.lazy(() => {
    const mutated = [];
    mutated.push(1);

    return random.return(mutated);
  });

  const [a] = gen.sample();
  const [b] = gen.sample();

  expect(a).toEqual([1]);
  expect(b).toEqual([1]);
});

test("compose maps two generators together", () => {
  const getTypeof = (...args: any[]) => {
    return args.map((arg) => typeof arg);
  };

  const genA = random.integer().composeMap(random.boolean(), getTypeof);
  const genB = random.integer().composeMap(random.boolean(), random.string(), getTypeof);
  const genC = random.integer().composeMap(random.boolean(), random.string(), random.float(), getTypeof);
  const genD = random.return(undefined).composeMap(random.boolean(), random.string(), random.float(), random.object({}), getTypeof);

  const genE = random
    .return(undefined)
    .composeMap(random.float(), random.float(), random.float(), random.float(), (...args: any[]) => args);

  const [resultA] = genA.sample();
  const [resultB] = genB.sample();
  const [resultC] = genC.sample();
  const [resultD] = genD.sample();
  const [resultE] = genE.sample({ seed: 12345 });

  expect(resultA).toEqual(["number", "boolean"]);
  expect(resultB).toEqual(["number", "boolean", "string"]);
  expect(resultC).toEqual(["number", "boolean", "string", "number"]);
  expect(resultD).toEqual(["undefined", "boolean", "string", "number", "object"]);

  // assert that they don't reuse the same seed
  expect(resultE).toEqual([undefined, -35.012848220723484, 85.60161273779835, -74.6010240346336, 73.09555152182492]);
});
