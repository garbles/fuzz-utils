import rand from "./random";

const take = <T>(iterable: Iterable<T>, total: number): T[] => {
  let result: T[] = Array(total);
  let i = 0;

  for (let t of iterable) {
    result[i] = t;
    i++;
    if (i >= total) {
      break;
    }
  }

  return result;
};

test("same result will always generate the same integers", () => {
  const result = rand.integer();

  const [a] = result.sample({ seed: 1 });
  const [b] = result.sample({ seed: 1 });

  expect(a).toEqual(b);
});

test("same result if the filter does not change the outcome", () => {
  const result = rand.integer();

  const [a] = result.resize(10).sample({ seed: 1 });
  const [b] = result
    .resize(10)
    .filter(x => x < 11)
    .sample({ seed: 1 });

  expect(a).toEqual(b);
});

test("filters and maps results until it does not return rand.FILTER_MAP_REJECT", () => {
  const [result] = rand
    .integer()
    .filterMap((v, REJECT) => {
      if (v <= 90) {
        return REJECT;
      }

      return v;
    })
    .sample();

  expect(result).toBeGreaterThan(90);
});

test("different result if an appropriate result is used", () => {
  const result = rand.integer();

  const [a] = result.filter(x => x > 0).sample({ seed: 1 });
  const [b] = result.filter(x => x === 0).sample({ seed: 1 });

  expect(a).not.toEqual(b);
  expect(b).toEqual(0);
});

test("allows you to set a maximum number of tries and throw when it isn't met", () => {
  const result = rand.integer();
  const a = jest.fn(x => x > 10);
  const b = jest.fn(x => x > 10);

  expect(() =>
    result
      .resize(10)
      .filter(a)
      .sample({ seed: 1e3 })
  ).toThrow(new Error("Could not satisfy filter in 10000 tries."));

  expect(() =>
    result
      .resize(10)
      .filter(b, 10)
      .sample({ seed: 1e3 })
  ).toThrow(new Error("Could not satisfy filter in 10 tries."));

  expect(a).toHaveBeenCalledTimes(1e4);
  expect(b).toHaveBeenCalledTimes(10);
});

test("same result will always generate the same list of integers", () => {
  const result = rand.array(rand.integer());

  const [a] = result.sample({ seed: 1, maxSize: 10 });
  const [b] = result.sample({ seed: 1, maxSize: 10 });

  expect(a).toEqual(b);
});

test("creates a list of integers where all numbers are greater than 5", () => {
  const [value] = rand
    .array(
      rand
        .integer()
        .resize(10)
        .filter(x => x > 5)
    )
    .sample({ seed: 1, maxSize: 40 });

  expect(value.length).toBeLessThanOrEqual(40);
  value.forEach(v => expect(v).toBeGreaterThan(5));
});

test("create integers within a range", () => {
  for (let value of take(rand.integerWithin(3, 7).toIterable(), 50)) {
    expect(value).toBeGreaterThanOrEqual(3);
    expect(value).toBeLessThanOrEqual(7);
  }
});

test("creates boolean values", () => {
  const [value] = rand.array(rand.boolean()).sample({ seed: 1 });
  value.forEach(v => expect(typeof v).toEqual("boolean"));
});

test("creates character values", () => {
  const [valueA] = rand.character().sample({ seed: 1 });

  expect(typeof valueA).toEqual("string");
  expect(valueA).toHaveLength(1);
});

test("creates string values", () => {
  const [value] = rand
    .string()
    .resize(10)
    .filter(v => v.length === 10)
    .sample({ seed: 1 });

  expect(typeof value).toEqual("string");
  expect(value).toHaveLength(10);
});

test("can map values", () => {
  const [value] = rand
    .array(
      rand
        .integer()
        .resize(10)
        .map(x => x + 1)
    )
    .sample({ seed: 1, maxSize: 20 });

  value.forEach(v => {
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(11);
  });
});

test("can map and filter values", () => {
  const [value] = rand
    .array(
      rand
        .integer()
        .resize(10)
        .map(x => x + 1)
        .filter(x => x === 5)
    )
    .resize(20)
    .filter(arr => arr.length === 10)
    .sample({ seed: 1 });

  expect(value).toHaveLength(10);
  value.forEach(v => expect(v).toEqual(5));
});

test("can bind to a different generator", () => {
  const int = rand.integer();

  const [value] = int
    .bind(v => {
      return rand
        .string()
        .resize(v)
        .filter(s => s.length === v);
    })
    .sample({ seed: 1e2 });

  expect(typeof value).toEqual("string");
  expect(value).toHaveLength(int.sample({ seed: 1e2 })[0]);
});

test("does not adopt the binding of the other generator", () => {
  const arrs = rand
    .posInteger()
    .resize(100)
    .bind(v =>
      rand
        .array(rand.return(v))
        .resize(5)
        .noEmpty()
    )
    .toIterable();

  for (let arr of take(arrs, 50)) {
    expect(arr.length).toBeLessThanOrEqual(5);
    expect(arr.length).toBeGreaterThan(0);

    for (let value of arr) {
      expect(value).toBeLessThanOrEqual(100);
    }
  }
});

test("can assign frequency to results", () => {
  const freq = rand.frequency([
    [1, rand.return(1)],
    [1, rand.return(2)],
    [1, rand.return(3)],
    [1, rand.return(4)],
    [10, rand.return(0)]
  ]);

  const [arr] = rand
    .array(freq)
    .resize(200)
    .filter(arr => arr.length === 200)
    .sample({ seed: 1e3 });
  const zeros = arr.filter(x => x === 0).length;

  // this could fail, but it's very unlikely
  expect(zeros).toBeGreaterThan(100);
});

test("can sample a list", () => {
  const sample = rand.oneOf([1, 2, 3]);
  const [result] = rand
    .array(sample)
    .resize(300)
    .filter(arr => arr.length === 300)
    .sample({ seed: 1e3 });

  const ones = result.filter(x => x === 1).length;
  const twos = result.filter(x => x === 2).length;
  const threes = result.filter(x => x === 3).length;

  expect(ones).toBeGreaterThan(80);
  expect(ones).toBeLessThan(120);
  expect(twos).toBeGreaterThan(80);
  expect(twos).toBeLessThan(120);
  expect(threes).toBeGreaterThan(80);
  expect(threes).toBeLessThan(120);
});

test("can make composite objects", () => {
  const obj = rand.object({
    x: rand.integer(),
    y: rand.integer()
  });

  const [a] = obj.sample({ seed: 1e2 });
  const [b] = obj.sample({ seed: 1e3 });
  const [c] = obj.sample({ seed: 1e3 });

  expect(Object.keys(a)).toEqual(Object.keys(b));
  expect(a).not.toEqual(b);
  expect(b).toEqual(c);
});

test("can make objects with plain values as keys", () => {
  const obj = rand.object({
    x: rand.integer(),
    y: 12
  });

  const [a] = obj.sample({ seed: 1e2 });
  const [b] = obj.sample({ seed: 1e3 });

  expect(a.x).not.toEqual(b.x);
  expect(a.y).toEqual(b.y);
});

test("skips n values from the same seed", () => {
  const number = rand.integer();

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
  const mapper = jest.fn<number, [number]>(x => x + 1);
  const filterer = jest.fn(x => x !== 0);
  const int = rand
    .integer()
    .map(mapper)
    .map(mapper)
    .filter(filterer)
    .map(mapper)
    .filter(filterer)
    .map(mapper)
    .filter(filterer)
    .memoize();

  const [a] = int.sample({ seed: 1e2 });
  const [b] = int.sample({ seed: 1e2 });
  const [c] = int.sample({ seed: 1e2 });

  expect(a).toEqual(b);
  expect(a).toEqual(c);
  expect(mapper).toHaveBeenCalledTimes(4);
  expect(filterer).toHaveBeenCalledTimes(3);
});

test("keeps memoization even if chained again in a new context if the same seed is used", () => {
  const mapper = jest.fn<number, [number]>(x => x + 1);
  const int = rand
    .integer()
    .map(mapper)
    .memoize();

  int.sample({ seed: 1e3 });
  int.filter(x => x > -1e5).sample({ seed: 1e3 });

  expect(mapper).toHaveBeenCalledTimes(1);
});

test("keeps memoization even if chained again in a new context unless a new seed is used", () => {
  const mapper = jest.fn<number, [number]>(x => x + 1);
  const int = rand
    .integer()
    .map(mapper)
    .memoize();

  int.sample({ seed: 1e3 });
  int.filter(x => x > -1e5).sample({ seed: 1e4 });

  expect(mapper).toHaveBeenCalledTimes(2);
});

test("can turn off memoziation", () => {
  const mapper = jest.fn<number, [number]>(x => x + 1);
  const filterer = jest.fn(x => x !== 0);
  const int = rand
    .integer()
    .map(mapper)
    .map(mapper)
    .filter(filterer)
    .map(mapper)
    .filter(filterer)
    .map(mapper)
    .filter(filterer);

  const a = int.sample({ seed: 1e2 });
  const b = int.sample({ seed: 1e2 });
  const c = int.sample({ seed: 1e2 });

  expect(a).toEqual(b);
  expect(a).toEqual(c);
  expect(mapper).toHaveBeenCalledTimes(12);
  expect(filterer).toHaveBeenCalledTimes(9);
});

test("creates a tuple from other generators", () => {
  const tuple = rand.tuple([
    rand.integer(),
    rand.string(),
    rand.object({ hello: "world", thing: rand.boolean() })
  ]);

  const [a] = tuple.sample({ seed: 1e2 });

  expect(typeof a[0]).toEqual("number");
  expect(typeof a[1]).toEqual("string");
  expect(typeof a[2].hello).toEqual("string");
  expect(typeof a[2].thing).toEqual("boolean");
});

test("generates a list of values", () => {
  const numbers = rand.integer().toIterable({ seed: 1e5 });

  for (let n of take(numbers, 50)) {
    expect(typeof n).toEqual("number");
  }
});

test("generates non empty values", () => {
  const numbers = rand
    .integer()
    .noEmpty()
    .toIterable({ seed: 1e5 });

  const array = rand
    .array(rand.integer())
    .noEmpty()
    .toIterable({ seed: 1e5 });

  for (let n of take(numbers, 50)) {
    expect(n).not.toEqual(0);
  }

  for (let arr of take(array, 50)) {
    expect(arr.length).toBeGreaterThan(0);
  }
});

test("generates nullable values", () => {
  const numbers = rand
    .integer()
    .nullable(4)
    .toIterable({ seed: Date.now() });
  const expected = 1000 / 4;

  const nulls = take(numbers, 1000).filter(x => x === null).length;

  expect(nulls).toBeGreaterThan(expected * 0.8);
  expect(nulls).toBeLessThan(expected * 1.2);
});

test("generates maybe values", () => {
  const numbers = rand
    .integer()
    .maybe(5)
    .toIterable({ seed: Date.now() });
  const expected = 1000 / 5;
  const undef = take(numbers, 1000).filter(x => x === undefined).length;

  expect(undef).toBeGreaterThan(expected * 0.8);
  expect(undef).toBeLessThan(expected * 1.2);
});

test("resizes generators", () => {
  const strings = rand
    .posInteger()
    .resize(10)
    .map(i => i.toString())
    .toIterable();

  for (let str of take(strings, 50)) {
    expect(parseInt(str, 10)).toBeLessThanOrEqual(10);
  }
});

test("generates empty values when maxSize is zero", () => {
  const [zero] = rand.integer().sample({ maxSize: 0 });
  const [falze] = rand.boolean().sample({ maxSize: 0 });
  const [emptyArr] = rand.array(rand.integer()).sample({ maxSize: 0 });
  const [emptyStr] = rand.string().sample({ maxSize: 0 });

  const [emptyObj] = rand
    .object({
      a: rand.integer(),
      b: rand.boolean(),
      c: rand.array(rand.integer()),
      d: rand.string()
    })
    .sample({ maxSize: 0 });

  expect(zero).toEqual(0);
  expect(falze).toEqual(false);
  expect(emptyArr).toEqual([]);
  expect(emptyStr).toEqual("");
  expect(emptyObj).toEqual({ a: 0, b: false, c: [], d: "" });
});

test("generates bytes", () => {
  const [byte] = rand.byte().sample();

  expect(byte).toBeGreaterThanOrEqual(0);
  expect(byte).toBeLessThanOrEqual(255);
});

test("generates uuids", () => {
  const [uuid] = rand.uuid().sample();

  expect(uuid).toHaveLength(36);
  expect(uuid[8]).toEqual("-");
  expect(uuid[13]).toEqual("-");
  expect(uuid[14]).toEqual("4");
  expect(uuid[18]).toEqual("-");
  expect(uuid[23]).toEqual("-");

  uuid
    .split("")
    .filter(char => char !== "-")
    .forEach(char => {
      expect(parseInt(char, 16)).toBeLessThanOrEqual(15);
      expect(parseInt(char, 16)).toBeGreaterThanOrEqual(0);
    });
});

test("generates an unbiased integer within a range", () => {
  const count = 1e3;
  const arr = take(rand.integerWithin(0, 4).toIterable(), count);

  const results = arr.reduce(
    (acc, num) => {
      return [
        acc[0] + Number(num === 0),
        acc[1] + Number(num === 1),
        acc[2] + Number(num === 2),
        acc[3] + Number(num === 3),
        acc[4] + Number(num === 4)
      ];
    },
    [0, 0, 0, 0, 0]
  );

  results.forEach(num => {
    expect(num).toBeGreaterThanOrEqual((count / 5) * 0.8);
    expect(num).toBeLessThanOrEqual((count / 5) * 1.2);
  });
});
