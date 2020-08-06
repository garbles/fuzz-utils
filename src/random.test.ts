import rand from "./random";

async function* take<T>(gen: AsyncGenerator<T>, total: number): AsyncGenerator<T> {
  let i = 0;

  for await (let t of gen) {
    yield t;
    i++;
    if (i >= total) {
      break;
    }
  }
}

test("same result will always generate the same integers", async () => {
  const result = rand.integer();

  const [a] = await result.sample({ seed: 1 });
  const [b] = await result.sample({ seed: 1 });

  expect(a).toEqual(b);
});

test("same result if the filter does not change the outcome", async () => {
  const result = rand.integer();

  const [a] = await result.resize(10).sample({ seed: 1 });
  const [b] = await result
    .resize(10)
    .filter((x) => x < 11)
    .sample({ seed: 1 });

  expect(a).toEqual(b);
});

test("filters and maps results until it does not return rand.FILTER_MAP_REJECT", async () => {
  const [result] = await rand
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

test("different result if an appropriate result is used", async () => {
  const result = rand.integer();

  const [a] = await result.filter((x) => x > 0).sample({ seed: 1 });
  const [b] = await result.filter((x) => x === 0).sample({ seed: 1 });

  expect(a).not.toEqual(b);
  expect(b).toEqual(0);
});

test("allows you to set a maximum number of tries and throw when it isn't met", async () => {
  expect.assertions(4);

  const result = rand.integer();
  const a = jest.fn((x) => x > 10);
  const b = jest.fn((x) => x > 10);

  try {
    await result.resize(10).filter(a).sample({ seed: 1e3 });
  } catch (err) {
    expect(err).toEqual(new Error("Could not satisfy filter in 10000 tries."));
  }

  try {
    await result.resize(10).filter(b, 10).sample({ seed: 1e3 });
  } catch (err) {
    expect(err).toEqual(new Error("Could not satisfy filter in 10 tries."));
  }

  expect(a).toHaveBeenCalledTimes(1e4);
  expect(b).toHaveBeenCalledTimes(10);
});

test("same result will always generate the same list of integers", async () => {
  const result = rand.array(rand.integer());

  const [a] = await result.sample({ seed: 1, maxSize: 10 });
  const [b] = await result.sample({ seed: 1, maxSize: 10 });

  expect(a).toEqual(b);
});

test("creates a list of integers where all numbers are greater than 5", async () => {
  const [value] = await rand
    .array(
      rand
        .integer()
        .resize(10)
        .filter((x) => x > 5)
    )
    .sample({ seed: 1, maxSize: 40 });

  expect(value.length).toBeLessThanOrEqual(40);
  value.forEach((v) => expect(v).toBeGreaterThan(5));
});

test("create integers within a range", async () => {
  for await (let value of take(rand.integerWithin(3, 7).toIterator(), 50)) {
    expect(value).toBeGreaterThanOrEqual(3);
    expect(value).toBeLessThanOrEqual(7);
  }
});

test("creates boolean values", async () => {
  const [value] = await rand.array(rand.boolean()).sample({ seed: 1 });
  value.forEach((v) => expect(typeof v).toEqual("boolean"));
});

test("creates character values", async () => {
  const [valueA] = await rand.character().sample({ seed: 1 });

  expect(typeof valueA).toEqual("string");
  expect(valueA).toHaveLength(1);
});

test("creates string values", async () => {
  const [value] = await rand
    .string()
    .resize(10)
    .filter((v) => v.length === 10)
    .sample({ seed: 1 });

  expect(typeof value).toEqual("string");
  expect(value).toHaveLength(10);
});

test("can map values", async () => {
  const [value] = await rand
    .array(
      rand
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

test("can map and filter values", async () => {
  const [value] = await rand
    .array(
      rand
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

test("can bind to a different generator", async () => {
  const int = rand.integer();

  const [value] = await int
    .bind((v) => {
      return rand
        .string()
        .resize(v)
        .filter((s) => s.length === v);
    })
    .sample({ seed: 1e2 });

  expect(typeof value).toEqual("string");
  expect(value).toHaveLength((await int.sample({ seed: 1e2 }))[0]);
});

test("does not adopt the binding of the other generator", async () => {
  const arrs = rand
    .posInteger()
    .resize(100)
    .bind((v) => rand.array(rand.return(v)).resize(5).noEmpty())
    .toIterator();

  for await (let arr of take(arrs, 50)) {
    expect(arr.length).toBeLessThanOrEqual(5);
    expect(arr.length).toBeGreaterThan(0);

    for (let value of arr) {
      expect(value).toBeLessThanOrEqual(100);
    }
  }
});

test("can assign frequency to results", async () => {
  const freq = rand.frequency([
    [1, rand.return(1)],
    [1, rand.return(2)],
    [1, rand.return(3)],
    [1, rand.return(4)],
    [10, rand.return(0)],
  ]);

  const [arr] = await rand
    .array(freq)
    .resize(200)
    .filter((arr) => arr.length === 200)
    .sample({ seed: 1e3 });
  const zeros = arr.filter((x) => x === 0).length;

  // this could fail, but it's very unlikely
  expect(zeros).toBeGreaterThan(100);
});

test("can sample a list", async () => {
  const sample = rand.oneOf([1, 2, 3]);
  const [result] = await rand
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

test("can make composite objects", async () => {
  const obj = rand.object({
    x: rand.integer(),
    y: rand.integer(),
  });

  const [a] = await obj.sample({ seed: 1e2 });
  const [b] = await obj.sample({ seed: 1e3 });
  const [c] = await obj.sample({ seed: 1e3 });

  expect(Object.keys(a)).toEqual(Object.keys(b));
  expect(a).not.toEqual(b);
  expect(b).toEqual(c);
});

test("can make objects with plain values as keys", async () => {
  const obj = rand.object({
    x: rand.integer(),
    y: 12,
  });

  const [a] = await obj.sample({ seed: 1e2 });
  const [b] = await obj.sample({ seed: 1e3 });

  expect(a.x).not.toEqual(b.x);
  expect(a.y).toEqual(b.y);
});

test("skips n values from the same seed", async () => {
  const number = rand.integer();

  const [a] = await number.sample({ seed: 1e2 });
  const [b] = await number.skip(1).sample({ seed: 1e2 });
  const [c] = await number.skip(1).sample({ seed: 1e2 });
  const [d] = await number.skip(2).sample({ seed: 1e2 });
  const [e] = await number.skip(3).sample({ seed: 1e2 });
  const [f] = await number.skip(3).sample({ seed: 1e2 });

  expect([b, c, d, e, f]).not.toContain(a);
  expect([b]).toContain(c);
  expect([d, e, f]).not.toContain(b);
  expect([e, f]).not.toContain(d);
  expect([e]).toContain(f);
});

test("memoizes the result so that they are not recomputed with the same seed", async () => {
  const mapper = jest.fn<number, [number]>((x) => x + 1);
  const filterer = jest.fn((x) => x !== 0);
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

  const [a] = await int.sample({ seed: 1e2 });
  const [b] = await int.sample({ seed: 1e2 });
  const [c] = await int.sample({ seed: 1e2 });

  expect(a).toEqual(b);
  expect(a).toEqual(c);
  expect(mapper).toHaveBeenCalledTimes(4);
  expect(filterer).toHaveBeenCalledTimes(3);
});

test("keeps memoization even if chained again in a new context if the same seed is used", async () => {
  const mapper = jest.fn<number, [number]>((x) => x + 1);
  const int = rand.integer().map(mapper).memoize();

  await int.sample({ seed: 1e3 });
  await int.filter((x) => x > -1e5).sample({ seed: 1e3 });

  expect(mapper).toHaveBeenCalledTimes(1);
});

test("keeps memoization even if chained again in a new context unless a new seed is used", async () => {
  const mapper = jest.fn<number, [number]>((x) => x + 1);
  const int = rand.integer().map(mapper).memoize();

  await int.sample({ seed: 1e3 });
  await int.filter((x) => x > -1e5).sample({ seed: 1e4 });

  expect(mapper).toHaveBeenCalledTimes(2);
});

test("can turn off memoziation", async () => {
  const mapper = jest.fn<number, [number]>((x) => x + 1);
  const filterer = jest.fn((x) => x !== 0);
  const int = rand
    .integer()
    .map(mapper)
    .map(mapper)
    .filter(filterer)
    .map(mapper)
    .filter(filterer)
    .map(mapper)
    .filter(filterer);

  const a = await int.sample({ seed: 1e2 });
  const b = await int.sample({ seed: 1e2 });
  const c = await int.sample({ seed: 1e2 });

  expect(a).toEqual(b);
  expect(a).toEqual(c);
  expect(mapper).toHaveBeenCalledTimes(12);
  expect(filterer).toHaveBeenCalledTimes(9);
});

test("creates a tuple from other generators", async () => {
  const tuple = rand.tuple([
    rand.integer(),
    rand.string(),
    rand.object({ hello: "world", thing: rand.boolean() }),
  ]);

  const [a] = await tuple.sample({ seed: 1e2 });

  expect(typeof a[0]).toEqual("number");
  expect(typeof a[1]).toEqual("string");
  expect(typeof a[2].hello).toEqual("string");
  expect(typeof a[2].thing).toEqual("boolean");
});

test("generates a list of values", async () => {
  const numbers = rand.integer().toIterator({ seed: 1e5 });

  for await (let n of take(numbers, 50)) {
    expect(typeof n).toEqual("number");
  }
});

test("generates non empty values", async () => {
  const numbers = rand.integer().noEmpty().toIterator({ seed: 1e5 });

  const array = rand.array(rand.integer()).noEmpty().toIterator({ seed: 1e5 });

  for await (let n of take(numbers, 50)) {
    expect(n).not.toEqual(0);
  }

  for await (let arr of take(array, 50)) {
    expect(arr.length).toBeGreaterThan(0);
  }
});

test("generates nullable values", async () => {
  const numbers = rand.integer().nullable(4).toIterator({ seed: Date.now() });
  const expected = 1000 / 4;

  let nulls = 0;

  for await (let next of take(numbers, 1000)) {
    if (next === null) {
      nulls++;
    }
  }

  expect(nulls).toBeGreaterThan(expected * 0.8);
  expect(nulls).toBeLessThan(expected * 1.2);
});

test("generates maybe values", async () => {
  const numbers = rand.integer().maybe(5).toIterator({ seed: Date.now() });
  const expected = 1000 / 5;

  let undef = 0;

  for await (let next of take(numbers, 1000)) {
    if (next === undefined) {
      undef++;
    }
  }

  expect(undef).toBeGreaterThan(expected * 0.8);
  expect(undef).toBeLessThan(expected * 1.2);
});

test("resizes generators", async () => {
  const strings = rand
    .posInteger()
    .resize(10)
    .map((i) => i.toString())
    .toIterator();

  for await (let str of take(strings, 50)) {
    expect(parseInt(str, 10)).toBeLessThanOrEqual(10);
  }
});

test("generates empty values when maxSize is zero", async () => {
  const [zero] = await rand.integer().sample({ maxSize: 0 });
  const [falze] = await rand.boolean().sample({ maxSize: 0 });
  const [emptyArr] = await rand.array(rand.integer()).sample({ maxSize: 0 });
  const [emptyStr] = await rand.string().sample({ maxSize: 0 });

  const [emptyObj] = await rand
    .object({
      a: rand.integer(),
      b: rand.boolean(),
      c: rand.array(rand.integer()),
      d: rand.string(),
    })
    .sample({ maxSize: 0 });

  expect(zero).toEqual(0);
  expect(falze).toEqual(false);
  expect(emptyArr).toEqual([]);
  expect(emptyStr).toEqual("");
  expect(emptyObj).toEqual({ a: 0, b: false, c: [], d: "" });
});

test("generates bytes", async () => {
  const [byte] = await rand.byte().sample();

  expect(byte).toBeGreaterThanOrEqual(0);
  expect(byte).toBeLessThanOrEqual(255);
});

test("generates uuids", async () => {
  const [uuid] = await rand.uuid().sample();

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

test("generates an unbiased integer within a range", async () => {
  const count = 1e3;
  const arr = [];

  for await (let next of take(rand.integerWithin(0, 4).toIterator(), count)) {
    arr.push(next);
  }

  const results = arr.reduce(
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

test("lazy evaluate code in a closure", async () => {
  const gen = rand.lazy(() => {
    const mutated = [];
    mutated.push(1);

    return rand.return(mutated);
  });

  const [a] = await gen.sample();
  const [b] = await gen.sample();

  expect(a).toEqual([1]);
  expect(b).toEqual([1]);
});

test("is awaitable", async () => {
  const gen = rand.integer();

  const resA = await gen;
  const resB = await gen;

  expect(resA).not.toEqual(resB);
  expect(typeof resA).toEqual("number");
  expect(typeof resB).toEqual("number");
});

test("derefences generators to functions", async () => {
  const gen = rand.deref(async (api) => {
    return [
      typeof (await api.integer()),
      typeof (await api.integer()),
      typeof (await api.string()),
      typeof (await api.string()),
      typeof (await api.boolean()),
    ];
  });

  const [arr] = await gen.sample();

  expect(arr).toEqual(["number", "number", "string", "string", "boolean"]);
});

test("dereferences deterministically", async () => {
  const gen = rand.deref(async (api) => {
    return [
      await api.integer(),
      await api.integer(),
      await api.string(),
      await api.string(),
      await api.boolean(),
    ];
  });

  const [seed] = await rand.seed().sample();
  const [resA] = await gen.sample({ seed });
  const [resB] = await gen.sample({ seed });
  const [resC] = await gen.sample({ seed });

  expect(resA).toEqual(resB);
  expect(resA).toEqual(resC);
});

test("can nest derefs", async () => {
  const gen = rand.deref(async (api) => {
    const nested = await api.deref(async (api2) => {
      return (await api2.integer()) + (await api2.integer());
    });

    return nested + (await api.integer());
  });

  const [seed] = await rand.seed().sample();
  const [resA] = await gen.sample({ seed });
  const [resB] = await gen.sample({ seed });
  const [resC] = await gen.sample({ seed });

  expect(resA).toEqual(resB);
  expect(resA).toEqual(resC);
});

test("compose maps two generators together", async () => {
  const getTypeof = (...args: any[]) => {
    return args.map((arg) => typeof arg);
  };

  const genA = rand.integer().composeMap(rand.boolean(), getTypeof);
  const genB = rand.integer().composeMap(rand.boolean(), rand.string(), getTypeof);
  const genC = rand.integer().composeMap(rand.boolean(), rand.string(), rand.float(), getTypeof);
  const genD = rand
    .return(undefined)
    .composeMap(rand.boolean(), rand.string(), rand.float(), rand.object({}), getTypeof);

  const genE = rand
    .return(undefined)
    .composeMap(rand.float(), rand.float(), rand.float(), rand.float(), (...args: any[]) => args);

  const [resultA] = await genA.sample();
  const [resultB] = await genB.sample();
  const [resultC] = await genC.sample();
  const [resultD] = await genD.sample();
  const [resultE] = await genE.sample({ seed: 12345 });

  expect(resultA).toEqual(["number", "boolean"]);
  expect(resultB).toEqual(["number", "boolean", "string"]);
  expect(resultC).toEqual(["number", "boolean", "string", "number"]);
  expect(resultD).toEqual(["undefined", "boolean", "string", "number", "object"]);

  // assert that they don't reuse the same seed
  expect(resultE).toEqual([
    undefined,
    -35.012848220723484,
    85.60161273779835,
    -74.6010240346336,
    73.09555152182492,
  ]);
});
