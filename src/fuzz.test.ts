import fuzz, { RoseTree } from "./fuzz";

type Results<T> = {
  value: T;
  children: T[];
  firstChild: T | undefined;
  secondChild: T | undefined;
  childrenOfChildren: {
    1: T[];
    2: T[];
  };
};

const extract = <T>(rose: RoseTree<any, T>): Results<T> => {
  let children: RoseTree<any, T>[] = [];

  for (let child of rose.children()) {
    children.push(child);
  }

  let childrenOfFirstChild: RoseTree<any, T>[] = [];
  let childrenOfSecondChild: RoseTree<any, T>[] = [];

  if (children[0]) {
    for (let child of children[0].children()) {
      childrenOfFirstChild.push(child);
    }
  }

  if (children[1]) {
    for (let child of children[1].children()) {
      childrenOfSecondChild.push(child);
    }
  }

  return {
    value: rose.value(),
    children: children.map((r) => r.value()),
    firstChild: children[0] ? children[0].value() : undefined,
    secondChild: children[1] ? children[1].value() : undefined,
    childrenOfChildren: {
      1: childrenOfFirstChild.map((r) => r.value()),
      2: childrenOfSecondChild.map((r) => r.value()),
    },
  };
};

const expectWithin25Percent = (value: number, expected: number) => {
  expect(value).toBeGreaterThanOrEqual(expected / 1.25);
  expect(value).toBeLessThanOrEqual(expected * 1.25);
};

test("shrinks positive integers", () => {
  const [rose] = fuzz.posInteger().toRandomRoseTree().sample({ maxSize: 1e3 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expect([...children].sort((a, b) => (a > b ? 1 : -1))).toEqual(children);

  children.forEach((child) => {
    expect(child).toBeLessThan(value);
  });

  if (firstChild) {
    expect(firstChild).toEqual(0);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expect(child).toBeLessThan(secondChild);
    });
  }
});

test("shrinks positive floats", () => {
  const [rose] = fuzz.posFloat().toRandomRoseTree().sample({ maxSize: 1e3 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expect([...children].sort((a, b) => (a > b ? 1 : -1))).toEqual(children);

  children.forEach((child) => {
    expect(child).toBeLessThan(value);
  });

  if (firstChild) {
    expect(firstChild).toEqual(0);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expect(child).toBeLessThan(secondChild);
    });
  }
});

test("shrinks positive numbers", () => {
  const [rose] = fuzz.posNumber().toRandomRoseTree().sample({ maxSize: 1e3 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expect([...children].sort((a, b) => (a > b ? 1 : -1))).toEqual(children);

  children.forEach((child) => {
    expect(child).toBeLessThan(value);
  });

  if (firstChild) {
    expect(firstChild).toEqual(0);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expect(child).toBeLessThan(secondChild);
    });
  }
});

test("shrinks negative integers", () => {
  const [rose] = fuzz.negInteger().toRandomRoseTree().sample({ maxSize: 1e3 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  children.forEach((child) => {
    expect(child).toBeGreaterThan(value);
  });

  if (firstChild) {
    expect(firstChild).toEqual(-0);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expect(child).toBeGreaterThan(secondChild);
    });
  }
});

test("shrinks negative floats", () => {
  const [rose] = fuzz.negFloat().toRandomRoseTree().sample({ maxSize: 1e3 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  children.forEach((child) => {
    expect(child).toBeGreaterThan(value);
  });

  if (firstChild) {
    expect(firstChild).toEqual(-0);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expect(child).toBeGreaterThan(secondChild);
    });
  }
});

test("shrinks negative numbers", () => {
  const [rose] = fuzz.negNumber().toRandomRoseTree().sample({ maxSize: 1e3 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  children.forEach((child) => {
    expect(child).toBeGreaterThan(value);
  });

  if (firstChild) {
    expect(firstChild).toEqual(-0);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expect(child).toBeGreaterThan(secondChild);
    });
  }
});

test("shrinks integers within a range", () => {
  const [rose] = fuzz.integerWithin(3, 30).toRandomRoseTree().sample();
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expect(value).toBeGreaterThanOrEqual(3);
  expect(value).toBeLessThanOrEqual(30);

  children.forEach((child) => {
    expect(child).toBeLessThan(value);
    expect(child).toBeGreaterThanOrEqual(3);
    expect(child).toBeLessThanOrEqual(30);
  });

  if (firstChild) {
    expect(firstChild).toEqual(3);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expect(child).toBeLessThan(secondChild);
      expect(child).toBeGreaterThanOrEqual(3);
      expect(child).toBeLessThanOrEqual(30);
    });
  }
});

test("shrinks floats within a range", () => {
  const [rose] = fuzz.floatWithin(3.5, 30).toRandomRoseTree().sample();
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expect(value).toBeGreaterThanOrEqual(3.5);
  expect(value).toBeLessThanOrEqual(30);

  children.forEach((child) => {
    expect(child).toBeLessThan(value);
    expect(child).toBeGreaterThanOrEqual(3.5);
    expect(child).toBeLessThanOrEqual(30);
  });

  if (firstChild) {
    expect(firstChild).toEqual(3.5);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expect(child).toBeLessThan(secondChild);
      expect(child).toBeGreaterThanOrEqual(3.5);
      expect(child).toBeLessThanOrEqual(30);
    });
  }
});

test("shrinks mixed integers", () => {
  const [rose] = fuzz.integer().toRandomRoseTree().sample({ maxSize: 1e3 });
  const { value, children } = extract(rose);

  if (value > 0) {
    children.forEach((child) => {
      expect(child).toBeLessThan(value);
    });
  } else {
    children.forEach((child) => {
      expect(child).toBeGreaterThanOrEqual(value);
    });
  }
});

test("shrinks mixed numbers", () => {
  const [rose] = fuzz.number().toRandomRoseTree().sample({ maxSize: 1e3 });
  const { value, children } = extract(rose);

  if (value > 0) {
    children.forEach((child) => {
      expect(child).toBeLessThan(value);
    });
  } else {
    children.forEach((child) => {
      expect(child).toBeGreaterThanOrEqual(value);
    });
  }
});

test("shrinks booleans", () => {
  const [rose] = fuzz.boolean().toRandomRoseTree().sample();

  const { value, children, childrenOfChildren } = extract(rose);

  if (value === true) {
    expect(children).toEqual([false]);
    expect(childrenOfChildren[1]).toEqual([]);
  } else {
    expect(children).toEqual([]);
  }
});

test("shrinks strings", () => {
  const [rose] = fuzz.string().toRandomRoseTree().sample({ maxSize: 10 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  children.forEach((child) => {
    expect(child).not.toEqual(value);
    expect(child.length).toBeLessThanOrEqual(value.length);
  });

  if (firstChild) {
    expect(firstChild).toEqual("");
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expect(child).not.toEqual(secondChild);
      expect(child.length).toBeLessThanOrEqual(secondChild!.length);
    });
  }
});

test("shrinks characters", () => {
  const [rose] = fuzz.character().toRandomRoseTree().sample();
  const { value, children, firstChild, childrenOfChildren } = extract(rose);

  children.forEach((child) => {
    expect(child.charCodeAt(0)).toBeLessThan(value.charCodeAt(0));
    expect(child).toHaveLength(1);
  });

  if (firstChild) {
    expect(firstChild).toEqual(" ");
    expect(childrenOfChildren[1]).toEqual([]);
  }
});

test("shrinks arrays of things", () => {
  const [rose] = fuzz.array(fuzz.integer()).toRandomRoseTree().sample({ maxSize: 20 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  children.forEach((child) => {
    expect(child).not.toEqual(value);
    expect(child.length).toBeLessThanOrEqual(value.length);
  });

  if (firstChild) {
    expect(firstChild).toEqual([]);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expect(child).not.toEqual(secondChild);
      expect(child.length).toBeLessThanOrEqual(secondChild!.length);
    });
  }
});

test("shrinks tuples", () => {
  const [rose] = fuzz
    .tuple([fuzz.integer(), fuzz.string()])
    .toRandomRoseTree()
    .sample({ maxSize: 10 });
  const { value, children, secondChild, childrenOfChildren } = extract(rose);

  children.forEach((child) => {
    expect(child).not.toEqual(value);
    expect(child.length).toEqual(value.length);
  });

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expect(child).not.toEqual(secondChild);
      expect(child.length).toBeLessThanOrEqual(secondChild.length);
    });
  }
});

test("shrinks objects", () => {
  const [rose] = fuzz
    .object({
      name: fuzz.string().resize(10),
      age: fuzz.posInteger().resize(100),
      tag: fuzz.return("constant"),
      other: "plain",
    })
    .toRandomRoseTree()
    .sample();

  const expectIsPerson = (obj: any) => {
    expect(typeof obj.name).toEqual("string");
    expect(obj.name.length).toBeLessThanOrEqual(10);
    expect(typeof obj.age).toEqual("number");
    expect(obj.age).toBeGreaterThanOrEqual(0);
    expect(obj.age).toBeLessThanOrEqual(100);
    expect(obj.tag).toEqual("constant");
    expect(obj.other).toEqual("plain");
  };

  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expectIsPerson(value);

  children.forEach((child) => {
    expectIsPerson(child);
    expect(child.age).toBeLessThanOrEqual(value.age);
    expect(child.name.length).toBeLessThanOrEqual(value.name.length);
  });

  if (firstChild) {
    childrenOfChildren[1].forEach((child) => {
      expectIsPerson(child);
      expect(child.age).toBeLessThanOrEqual(firstChild.age);
      expect(child.name.length).toBeLessThanOrEqual(firstChild.name.length);
    });
  }

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expectIsPerson(child);
      expect(child.age).toBeLessThanOrEqual(secondChild.age);
      expect(child.name.length).toBeLessThanOrEqual(secondChild.name.length);
    });
  }
});

test("filters out unwanted values", () => {
  const [rose] = fuzz
    .integer()
    .resize(1e4)
    .suchThat((x) => x > 200)
    .toRandomRoseTree()
    .sample();
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expect(value).toBeGreaterThan(200);

  children.forEach((child) => {
    expect(child).toBeLessThan(value);
  });

  /**
   * first child is greater than zero because our filter only allows for values
   * GREATER than 200
   */
  expect(firstChild).toBeGreaterThan(200);

  if (firstChild) {
    childrenOfChildren[1].forEach((child) => {
      expect(child).toBeLessThan(firstChild);
    });
  }

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expect(child).toBeLessThan(secondChild);
    });
  }
});

test("maps values", () => {
  const seed = Date.now();
  const pre = fuzz.integer();
  const post = pre.map((x) => Math.abs(x));

  const { value: preValue, children: preChildren } = extract(
    pre.toRandomRoseTree().sample({ seed, maxSize: 1e4 })[0]
  );
  const { value: postValue, children: postChildren } = extract(
    post.toRandomRoseTree().sample({ seed, maxSize: 1e4 })[0]
  );

  expect(Math.abs(preValue)).toEqual(postValue);
  expect(preChildren.map(Math.abs)).toEqual(postChildren);
});

test("binds to new fuzzers", () => {
  const [rose] = fuzz
    .posInteger()
    .bind((x) => fuzz.string().resize(x))
    .toRandomRoseTree()
    .sample({ maxSize: 40 });
  const { value, children } = extract(rose);

  expect(typeof value).toEqual("string");

  children.forEach((child) => {
    expect(typeof child).toEqual("string");
  });
});

test("does not include empty values", () => {
  const [rose] = fuzz.integer().noEmpty().toRandomRoseTree().sample({ maxSize: 10 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expect(value).not.toEqual(0);

  children.forEach((child) => {
    expect(child).not.toEqual(0);
  });

  if (firstChild) {
    childrenOfChildren[1].forEach((child) => {
      expect(child).not.toEqual(0);
    });
  }

  if (secondChild) {
    childrenOfChildren[2].forEach((child) => {
      expect(child).not.toEqual(0);
    });
  }
});

test("generates maybe values", () => {
  const roses = fuzz
    .integer()
    .maybe(6)
    .toRandomRoseTree()
    .toGenerator({ seed: Date.now(), maxSize: 10, count: 1e3 });
  const expected = 1e3 / 6;

  const results = [...roses].map(extract);
  const undef = results.filter((r) => r.value === undefined).length;

  expect(undef).toBeGreaterThan(expected * 0.8);
  expect(undef).toBeLessThan(expected * 1.2);
});

test("generates nullable values", () => {
  const roses = fuzz
    .integer()
    .nullable(4)
    .toRandomRoseTree()
    .toGenerator({ seed: Date.now(), maxSize: 10, count: 1e3 });
  const expected = 1e3 / 4;

  const results = [...roses].map(extract);
  const nulls = results.filter((r) => r.value === null).length;

  expect(nulls).toBeGreaterThan(expected * 0.8);
  expect(nulls).toBeLessThan(expected * 1.2);
});

test("can resize the fuzzer", () => {
  const roses = fuzz
    .posInteger()
    .map((i) => i.toString())
    .resize(10)
    .toRandomRoseTree()
    .toGenerator({ maxSize: 1e4, count: 1 });

  for (let rose of roses) {
    expect(parseInt(rose.value(), 10)).toBeLessThanOrEqual(10);
  }
});

test("create a constant value", () => {
  const [rose] = fuzz.return(1234).toRandomRoseTree().sample();
  const { value, children } = extract(rose);

  expect(value).toEqual(1234);
  expect(children).toEqual([]);
});

test("creates a uuid", () => {
  const [rose] = fuzz.uuid().toRandomRoseTree().sample();
  const { value, children } = extract(rose);

  // test is tests in @garbles/random
  expect(value).toHaveLength(36);
  // does not shrink
  expect(children).toEqual([]);
});

test("creates a frequency fuzzer", () => {
  const count = 2e3;
  const fuzzer = fuzz.frequency([
    [1, fuzz.return("a")],
    [5, fuzz.return("b")],
    [3, fuzz.return("c")],
  ]);

  const gen = fuzzer.toRandomRoseTree().toGenerator({ count });
  const values = [...gen].map((rose) => rose.value());

  const expectedA = count / 9;
  const expectedB = (count * 5) / 9;
  const expectedC = (count * 3) / 9;

  const as = values.filter((v) => v === "a").length;
  const bs = values.filter((v) => v === "b").length;
  const cs = values.filter((v) => v === "c").length;

  expectWithin25Percent(as, expectedA);
  expectWithin25Percent(bs, expectedB);
  expectWithin25Percent(cs, expectedC);
});

test("generates an unbiased oneOf fuzzer", () => {
  const count = 1e3;
  const fuzzer = fuzz.oneOf([fuzz.return("a"), fuzz.return("b"), fuzz.return("c")]);
  const gen = fuzzer.toRandomRoseTree().toGenerator({ count });
  const values = [...gen].map((rose) => rose.value());

  const as = values.filter((v) => v === "a").length;
  const bs = values.filter((v) => v === "b").length;
  const cs = values.filter((v) => v === "c").length;

  [as, bs, cs].forEach((num) => expectWithin25Percent(num, count / 3));
});

describe("biases values toward extremes", () => {
  const count = 2e3;

  describe("numbers", () => {
    const checker = (maxSize: number, zeroProb: number, minProb: number, maxProb: number) => {
      const fuzzer = fuzz.integer();
      const gen = fuzzer.toRandomRoseTree().toGenerator({ maxSize, count });
      const values = [...gen].map((rose) => rose.value());

      const zeros = values.filter((v) => v === 0).length;
      const min = values.filter((v) => v === -maxSize).length;
      const max = values.filter((v) => v === maxSize).length;

      expectWithin25Percent(zeros, count * zeroProb);
      expectWithin25Percent(min, count * minProb);
      expectWithin25Percent(max, count * maxProb);
    };

    test("maxSize === 1000", () => checker(1000, 1 / 15, 1 / 15, 1 / 15));
    test("maxSize === 50", () => checker(50, 1 / 9, 1 / 9, 1 / 9));
    test("maxSize === 0", () => checker(0, 1, 1, 1)); // min === max === 0
  });

  describe("strings", () => {
    const checker = (maxSize: number, zeroProb: number, shortProb: number, longProb: number) => {
      const fuzzer = fuzz.string();
      const gen = fuzzer.toRandomRoseTree().toGenerator({ maxSize, count });
      const values = [...gen].map((rose) => rose.value());

      const zeros = values.filter((v) => v.length === 0).length;
      const shorts = values.filter((v) => v.length <= 10 && v.length > 0).length;
      const longs = values.filter((v) => v.length > 50).length;

      expectWithin25Percent(zeros, count * zeroProb);
      expectWithin25Percent(shorts, count * shortProb);
      expectWithin25Percent(longs, count * longProb);
    };

    test("maxSize === 100", () => {
      checker(100, 1 / 10, 6 / 10, 1 / 10);
    });

    test("maxSize === 50", () => checker(50, 1 / 10, 6 / 10, 0));
    test("maxSize === 10", () => checker(10, 1 / 10, 9 / 10, 0));
    test("maxSize === 0", () => checker(0, 1, 0, 0));
  });

  describe("arrays", () => {
    const checker = (maxSize: number, zeroProb: number) => {
      const fuzzer = fuzz.array(fuzz.return(0));
      const gen = fuzzer.toRandomRoseTree().toGenerator({ maxSize, count });
      const values = [...gen].map((rose) => rose.value());

      const zeros = values.filter((v) => v.length === 0).length;
      expectWithin25Percent(zeros, count * zeroProb);
    };

    test("maxSize === 100", () => checker(100, 1 / 8));
    test("maxSize === 50", () => checker(50, 1 / 6));
    test("maxSize === 0", () => checker(0, 1));
  });
});

test("lazily returns a fuzzer", () => {
  const fn = jest.fn(() => fuzz.string());
  const fuzzer = fuzz.lazy(fn);

  expect(fn).toHaveBeenCalledTimes(0);

  let [rose] = fuzzer.toRandomRoseTree().sample();
  let { value } = extract(rose);

  expect(typeof value).toEqual("string");
  expect(fn).toHaveBeenCalledTimes(1);

  [rose] = fuzzer.toRandomRoseTree().sample();
  value = extract(rose).value;

  expect(typeof value).toEqual("string");
  expect(fn).toHaveBeenCalledTimes(2);
});

test("merges two fuzzers together", () => {
  const fuzzA = fuzz.integer();
  const fuzzB = fuzz.boolean();

  const fuzzer = fuzzA.merge(fuzzB, (a, b) => {
    return [a, b, 12] as [number, boolean, 12];
  });

  let [rose] = fuzzer.toRandomRoseTree().sample();
  let { value } = extract(rose);

  expect(typeof value[0]).toEqual("number");
  expect(typeof value[1]).toEqual("boolean");
  expect(value[2]).toEqual(12);
});

test("spreads many fuzzers together", () => {
  const fuzzA = fuzz.object({
    a: fuzz.integer(),
    b: fuzz.boolean(),
  });

  const fuzzB = fuzz.object({
    c: fuzz.array(fuzz.float()),
    d: fuzz.string(),
  });

  const expectSpread = (obj: any) => {
    expect(typeof obj.a).toEqual("number");
    expect(typeof obj.b).toEqual("boolean");
    expect(Array.isArray(obj.c)).toEqual(true);

    if (obj.c.length > 0) {
      expect(typeof obj.c[0]).toEqual("number");
    }

    expect(typeof obj.d).toEqual("string");
  };

  const fuzzer = fuzz.spread([fuzzA, fuzzB]);

  let [rose] = fuzzer.toRandomRoseTree().sample();
  let { value, children } = extract(rose);

  expectSpread(value);
  children.forEach(expectSpread);
});

test("spreads no fuzzers together", () => {
  const fuzzer = fuzz.spread([]);
  let [rose] = fuzzer.toRandomRoseTree().sample();
  let { value } = extract(rose);

  expect(value).toEqual({});
});

it("can map values to functions", () => {
  const fuzzer = fuzz.string().map((u) => () => u);
  const randRoses = fuzzer.toRandomRoseTree();

  const [rose] = randRoses.sample({ maxSize: 5 });
  const { value, children } = extract(rose);

  expect(typeof value).toBe("function");
  expect(typeof value()).toBe("string");

  children.forEach((child) => {
    expect(typeof child).toBe("function");
    expect(typeof child()).toBe("string");
  });
});
