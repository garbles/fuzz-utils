import shrink from "./shrink";

it("shrinks integers", () => {
  const num = Math.floor(1e5 * Math.random());

  /**
   * The algorithm always divides the number by two
   * when deciding on the next number, so the total
   * number of values is log_2 or the original value.
   */
  const count = Math.ceil(Math.log2(num));
  const result = shrink.integer().value(num);

  expect(result).toHaveLength(count);

  result.forEach(r => {
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(num);
  });
});

it("shrinks integers toward a pivot", () => {
  const result = shrink.towardInteger(-50).value(-500);

  result.forEach(r => {
    expect(r).toBeGreaterThan(-500);
    expect(r).toBeLessThanOrEqual(-50);
  });
});

it("it will stop at zero if the pivot and value are on opposite sides on the number line", () => {
  const result = shrink.towardInteger(-50).value(500);

  expect(result[0]).toEqual(0);
});

it("shrinks integer zero", () => {
  const result = shrink.integer().value(0);
  expect(result).toEqual([]);
});

it("shrinks float zero", () => {
  const result = shrink.float().value(0);
  expect(result).toEqual([]);
});

it("shrinks the integer pivot", () => {
  const result = shrink.atLeastInteger(50).value(50);
  expect(result).toEqual([]);
});

it("shrinks the float pivot", () => {
  const result = shrink.atLeastFloat(50).value(50);
  expect(result).toEqual([]);
});

it("shrinks floats", () => {
  const result = shrink.float().value(500);

  result.forEach(r => {
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(500);
  });
});

it("shrinks booleans", () => {
  const t = shrink.boolean().value(true);
  const f = shrink.boolean().value(false);

  expect(t).toEqual([false]);
  expect(f).toEqual([]);
});

it("shrinks empty strings", () => {
  const result = shrink.string().value("");
  expect(result).toEqual([]);
});

it("maps values to other types", () => {
  const result = shrink
    .integer()
    .map(n => String.fromCharCode(n) + String.fromCharCode(n))
    .value(500);

  result.forEach(r => {
    expect(typeof r).toEqual("string");
    expect(r).toHaveLength(2);
  });
});

it("filters values that do not meet some criteria", () => {
  const result = shrink
    .integer()
    .filter(n => n > 300)
    .filter(n => n < 450)
    .value(500);

  result.forEach(r => {
    expect(r).toBeGreaterThan(300);
    expect(r).toBeLessThan(450);
  });
});

it("can avoid shrinking", () => {
  const result = shrink
    .integer()
    .noShrink()
    .value(120);

  expect(result).toEqual([]);
});

it("with still shrink other values", () => {
  const result = shrink
    .tuple([shrink.string(), shrink.integer().noShrink()])
    .value(["hello!", 123]);

  result.forEach(r => {
    expect(r[0]).not.toEqual("hello!");
    expect(r[1]).toEqual(123);
  });
});

it("creates arrays of shrunken values", () => {
  const result = shrink.array(shrink.integer()).value([1, 2, 3, 4, 5]);

  result.forEach(r => {
    expect(r.length).toBeGreaterThanOrEqual(0);
    expect(r.length).toBeLessThanOrEqual(5);

    r.forEach(rr => {
      expect(rr).toBeLessThanOrEqual(5);
      expect(rr).toBeGreaterThanOrEqual(0);
    });
  });
});

it("shrinks empty arrays", () => {
  const result = shrink.array(shrink.integer()).value([]);
  expect(result).toEqual([]);
});

it("shrinks objects with base values for keys", () => {
  const result = shrink
    .object({ age: shrink.integer(), name: shrink.string() })
    .value({ age: 0, name: "" });

  expect(result).toEqual([]);
});

it("shrinks tuples", () => {
  const result = shrink.tuple([shrink.integer(), shrink.boolean()]).value([200, true]);

  result.forEach(r => {
    expect(typeof r[0]).toEqual("number");
    expect(r[0]).toBeLessThanOrEqual(200);
    expect(typeof r[1]).toEqual("boolean");
  });
});

it("shrinks empty tuples", () => {
  const result = shrink.tuple([]).value([]);
  expect(result).toEqual([]);
});

it("shrinks objects", () => {
  const result = shrink
    .object({
      name: shrink.string(),
      age: shrink.atLeastInteger(18),
      isCool: shrink.boolean()
    })
    .value({ name: "Gabe", age: 40, isCool: true });

  result.forEach(r => {
    expect(typeof r.name).toEqual("string");
    expect(typeof r.age).toEqual("number");
    expect(r.age).toBeGreaterThanOrEqual(18);
    expect(typeof r.isCool).toEqual("boolean");
  });
});

it("shrinks empty objects", () => {
  const result = shrink.object({}).value({});
  expect(result).toEqual([]);
});

it("shrinks strings", () => {
  const start = "hello world!";
  const result = shrink.string().value(start);

  result.forEach(r => {
    expect(typeof r).toEqual("string");
    expect(r.length).toBeLessThanOrEqual(start.length);
  });
});

it("removes empty values", () => {
  const string = shrink.string();
  const nonEmptyString = string.noEmpty();
  const number = shrink.integer();
  const nonEmptyNumber = number.noEmpty();
  const boolean = shrink.boolean();
  const nonEmptyBoolean = boolean.noEmpty();
  const array = shrink.array(shrink.integer());
  const nonEmptyArray = array.noEmpty();
  const arrayofNonEmptyIntegers = shrink.array(shrink.integer().noEmpty());

  expect(string.value("123")).toContain("");
  expect(nonEmptyString.value("123")).not.toContain("");
  expect(nonEmptyString.value("")).toEqual([]);

  expect(number.value(123)).toContain(0);
  expect(nonEmptyNumber.value(123)).not.toContain(0);
  expect(nonEmptyNumber.value(0)).toEqual([]);

  expect(boolean.value(true)).toContain(false);
  expect(nonEmptyBoolean.value(true)).toEqual([]);

  expect(array.value([1, 2, 3, 4, 5]).some(arr => arr.length === 0)).toBe(true);
  expect(nonEmptyArray.value([1, 2, 3, 4, 5]).some(arr => arr.length === 0)).toBe(false);
  expect(arrayofNonEmptyIntegers.value([1, 2, 3, 4, 5]).every(arr => arr.indexOf(0) === -1)).toBe(
    true
  );
  expect(nonEmptyArray.value([])).toEqual([]);
});

it("shrinks  maybe values", () => {
  const number = shrink.integer().maybe();

  expect(number.value(3)).toEqual([0, 2]);
  // no type error
  expect(number.value(undefined)).toEqual([]);
});

it("shrinks nullable values", () => {
  const number = shrink.integer().nullable();

  expect(number.value(3)).toEqual([0, 2]);
  // no type error
  expect(number.value(null)).toEqual([]);
});

it("noop shrink values", () => {
  const number = shrink.noop<number>().value(123);
  expect(number).toEqual([]);
});
