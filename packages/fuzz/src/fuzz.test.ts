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
    children: children.map(r => r.value()),
    firstChild: children[0] ? children[0].value() : undefined,
    secondChild: children[1] ? children[1].value() : undefined,
    childrenOfChildren: {
      1: childrenOfFirstChild.map(r => r.value()),
      2: childrenOfSecondChild.map(r => r.value())
    }
  };
};

test("shrinks positive integers", () => {
  const [rose] = fuzz
    .posInteger()
    .toRandomRoseTree()
    .sample({ maxSize: 1e3 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expect([...children].sort((a, b) => (a > b ? 1 : -1))).toEqual(children);

  children.forEach(child => {
    expect(child).toBeLessThan(value);
  });

  if (firstChild) {
    expect(firstChild).toEqual(0);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach(child => {
      expect(child).toBeLessThan(secondChild);
    });
  }
});

test("shrinks positive floats", () => {
  const [rose] = fuzz
    .posFloat()
    .toRandomRoseTree()
    .sample({ maxSize: 1e3 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expect([...children].sort((a, b) => (a > b ? 1 : -1))).toEqual(children);

  children.forEach(child => {
    expect(child).toBeLessThan(value);
  });

  if (firstChild) {
    expect(firstChild).toEqual(0);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach(child => {
      expect(child).toBeLessThan(secondChild);
    });
  }
});

test("shrinks negative integers", () => {
  const [rose] = fuzz
    .negInteger()
    .toRandomRoseTree()
    .sample({ maxSize: 1e3 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  children.forEach(child => {
    expect(child).toBeGreaterThan(value);
  });

  if (firstChild) {
    expect(firstChild).toEqual(-0);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach(child => {
      expect(child).toBeGreaterThan(secondChild);
    });
  }
});

test("shrinks negative floats", () => {
  const [rose] = fuzz
    .negFloat()
    .toRandomRoseTree()
    .sample({ maxSize: 1e3 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  children.forEach(child => {
    expect(child).toBeGreaterThan(value);
  });

  if (firstChild) {
    expect(firstChild).toEqual(-0);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach(child => {
      expect(child).toBeGreaterThan(secondChild);
    });
  }
});

test("shrinks integers within a range", () => {
  const [rose] = fuzz
    .integerWithin(3, 30)
    .toRandomRoseTree()
    .sample();
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expect(value).toBeGreaterThanOrEqual(3);
  expect(value).toBeLessThanOrEqual(30);

  children.forEach(child => {
    expect(child).toBeLessThan(value);
    expect(child).toBeGreaterThanOrEqual(3);
    expect(child).toBeLessThanOrEqual(30);
  });

  if (firstChild) {
    expect(firstChild).toEqual(3);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach(child => {
      expect(child).toBeLessThan(secondChild);
      expect(child).toBeGreaterThanOrEqual(3);
      expect(child).toBeLessThanOrEqual(30);
    });
  }
});

test("shrinks floats within a range", () => {
  const [rose] = fuzz
    .floatWithin(3.5, 30)
    .toRandomRoseTree()
    .sample();
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expect(value).toBeGreaterThanOrEqual(3.5);
  expect(value).toBeLessThanOrEqual(30);

  children.forEach(child => {
    expect(child).toBeLessThan(value);
    expect(child).toBeGreaterThanOrEqual(3.5);
    expect(child).toBeLessThanOrEqual(30);
  });

  if (firstChild) {
    expect(firstChild).toEqual(3.5);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach(child => {
      expect(child).toBeLessThan(secondChild);
      expect(child).toBeGreaterThanOrEqual(3.5);
      expect(child).toBeLessThanOrEqual(30);
    });
  }
});

test("shrinks mixed integers", () => {
  const [rose] = fuzz
    .integer()
    .toRandomRoseTree()
    .sample({ maxSize: 1e3 });
  const { value, children } = extract(rose);

  if (value > 0) {
    children.forEach(child => {
      expect(child).toBeLessThan(value);
    });
  } else {
    children.forEach(child => {
      expect(child).toBeGreaterThanOrEqual(value);
    });
  }
});

test("shrinks booleans", () => {
  const [rose] = fuzz
    .boolean()
    .toRandomRoseTree()
    .sample();

  const { value, children, childrenOfChildren } = extract(rose);

  if (value === true) {
    expect(children).toEqual([false]);
    expect(childrenOfChildren[1]).toEqual([]);
  } else {
    expect(children).toEqual([]);
  }
});

test("shrinks strings", () => {
  const [rose] = fuzz
    .string()
    .toRandomRoseTree()
    .sample({ maxSize: 10 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  children.forEach(child => {
    expect(child).not.toEqual(value);
    expect(child.length).toBeLessThanOrEqual(value.length);
  });

  if (firstChild) {
    expect(firstChild).toEqual("");
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach(child => {
      expect(child).not.toEqual(secondChild);
      expect(child.length).toBeLessThanOrEqual(secondChild!.length);
    });
  }
});

test("shrinks characters", () => {
  const [rose] = fuzz
    .character()
    .toRandomRoseTree()
    .sample();
  const { value, children, firstChild, childrenOfChildren } = extract(rose);

  children.forEach(child => {
    expect(child.charCodeAt(0)).toBeLessThan(value.charCodeAt(0));
    expect(child).toHaveLength(1);
  });

  if (firstChild) {
    expect(firstChild).toEqual(" ");
    expect(childrenOfChildren[1]).toEqual([]);
  }
});

test("shrinks arrays of things", () => {
  const [rose] = fuzz
    .array(fuzz.integer())
    .toRandomRoseTree()
    .sample({ maxSize: 20 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  children.forEach(child => {
    expect(child).not.toEqual(value);
    expect(child.length).toBeLessThanOrEqual(value.length);
  });

  if (firstChild) {
    expect(firstChild).toEqual([]);
    expect(childrenOfChildren[1]).toEqual([]);
  }

  if (secondChild) {
    childrenOfChildren[2].forEach(child => {
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

  children.forEach(child => {
    expect(child).not.toEqual(value);
    expect(child.length).toEqual(value.length);
  });

  if (secondChild) {
    childrenOfChildren[2].forEach(child => {
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
      other: "plain"
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

  children.forEach(child => {
    expectIsPerson(child);
    expect(child.age).toBeLessThanOrEqual(value.age);
    expect(child.name.length).toBeLessThanOrEqual(value.name.length);
  });

  if (firstChild) {
    childrenOfChildren[1].forEach(child => {
      expectIsPerson(child);
      expect(child.age).toBeLessThanOrEqual(firstChild.age);
      expect(child.name.length).toBeLessThanOrEqual(firstChild.name.length);
    });
  }

  if (secondChild) {
    childrenOfChildren[2].forEach(child => {
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
    .filter(x => x > 200)
    .toRandomRoseTree()
    .sample();
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expect(value).toBeGreaterThan(200);

  children.forEach(child => {
    expect(child).toBeLessThan(value);
  });

  /**
   * first child is greater than zero because our filter only allows for values
   * GREATER than 200
   */
  expect(firstChild).toBeGreaterThan(200);

  if (firstChild) {
    childrenOfChildren[1].forEach(child => {
      expect(child).toBeLessThan(firstChild);
    });
  }

  if (secondChild) {
    childrenOfChildren[2].forEach(child => {
      expect(child).toBeLessThan(secondChild);
    });
  }
});

test("maps values", () => {
  const seed = Date.now();
  const pre = fuzz.integer();
  const post = pre.map(x => Math.abs(x));

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
    .bind(x => fuzz.string().resize(x))
    .toRandomRoseTree()
    .sample({ maxSize: 40 });
  const { value, children } = extract(rose);

  expect(typeof value).toEqual("string");

  children.forEach(child => {
    expect(typeof child).toEqual("string");
  });
});

test("does not include empty values", () => {
  const [rose] = fuzz
    .integer()
    .noEmpty()
    .toRandomRoseTree()
    .sample({ maxSize: 10 });
  const { value, children, firstChild, secondChild, childrenOfChildren } = extract(rose);

  expect(value).not.toEqual(0);

  children.forEach(child => {
    expect(child).not.toEqual(0);
  });

  if (firstChild) {
    childrenOfChildren[1].forEach(child => {
      expect(child).not.toEqual(0);
    });
  }

  if (secondChild) {
    childrenOfChildren[2].forEach(child => {
      expect(child).not.toEqual(0);
    });
  }
});

test("generates maybe values", () => {
  const roses = fuzz
    .integer()
    .maybe(6)
    .toRandomRoseTree()
    .toIterable({ seed: Date.now(), maxSize: 10 });
  const expected = 1e3 / 6;

  const results = take(roses, 1e3).map(extract);
  const undef = results.filter(r => r.value === undefined).length;

  expect(undef).toBeGreaterThan(expected * 0.8);
  expect(undef).toBeLessThan(expected * 1.2);
});

test("generates nullable values", () => {
  const roses = fuzz
    .integer()
    .nullable(4)
    .toRandomRoseTree()
    .toIterable({ seed: Date.now(), maxSize: 10 });
  const expected = 1e3 / 4;

  const results = take(roses, 1e3).map(extract);
  const nulls = results.filter(r => r.value === null).length;

  expect(nulls).toBeGreaterThan(expected * 0.8);
  expect(nulls).toBeLessThan(expected * 1.2);
});

test("can resize the fuzzer", () => {
  const roses = fuzz
    .posInteger()
    .map(i => i.toString())
    .resize(10)
    .toRandomRoseTree()
    .toIterable({ maxSize: 1e4 });

  for (let rose of take(roses, 1)) {
    expect(parseInt(rose.value(), 10)).toBeLessThanOrEqual(10);
  }
});

test("create a constant value", () => {
  const [rose] = fuzz
    .return(1234)
    .toRandomRoseTree()
    .sample();
  const { value, children } = extract(rose);

  expect(value).toEqual(1234);
  expect(children).toEqual([]);
});

test("creates a uuid", () => {
  const [rose] = fuzz
    .uuid()
    .toRandomRoseTree()
    .sample();
  const { value, children } = extract(rose);

  // test is tests in @garbles/random
  expect(value).toHaveLength(36);
  // does not shrink
  expect(children).toEqual([]);
});

test("creates a growing rose tree of values where the first is always the empty tree", () => {
  const fuzzer = fuzz.object({
    name: fuzz.string(),
    age: fuzz.posInteger().map(x => x + 5),
    friends: fuzz.array(fuzz.string()),
    tag: fuzz.string(),
    other: fuzz.string()
  });

  const empty = {
    name: "",
    age: 5,
    friends: [],
    tag: "",
    other: ""
  };

  const [rose] = take(fuzzer.toRandomRoseTree().toLinearGrowthIterable(), 1);
  const { value, children } = extract(rose);

  // the root value of the first rose tree has a to be the empty one
  expect(value).toEqual(empty);
  expect(children).toEqual([]);
});

test("creates a frequency fuzzer", () => {
  const count = 1e3;
  const fuzzer = fuzz.frequency([
    [1, fuzz.return("a")],
    [5, fuzz.return("b")],
    [3, fuzz.return("c")]
  ]);

  const values = take(fuzzer.toRandomRoseTree().toIterable(), count).map(rose => rose.value());

  const expectedA = count / 9;
  const expectedB = (count * 5) / 9;
  const expectedC = (count * 3) / 9;

  const as = values.filter(v => v === "a").length;
  const bs = values.filter(v => v === "b").length;
  const cs = values.filter(v => v === "c").length;

  expect(as).toBeGreaterThan(expectedA * 0.8);
  expect(as).toBeLessThan(expectedA * 1.2);

  expect(bs).toBeGreaterThan(expectedB * 0.8);
  expect(bs).toBeLessThan(expectedB * 1.2);

  expect(cs).toBeGreaterThan(expectedC * 0.8);
  expect(cs).toBeLessThan(expectedC * 1.2);
});
