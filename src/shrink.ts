type Generator<T, U = T> = (t: T) => Iterable<U>;
type NumberSeriesFunction = (low: number, high: number, xs?: number[]) => Iterable<number>;

const take = <T>(arr: T[], count: number): T[] => arr.slice(0, count);
const drop = <T>(arr: T[], count: number): T[] => arr.slice(count, arr.length);
const empty = (obj: any) => !!obj === false || obj.length === 0;

const integerSeries: NumberSeriesFunction = function* (low, high, xs = []) {
  if (low >= high) {
    return;
  }

  yield low;

  if (low === high - 1) {
    return;
  }

  const next = low + Math.round((high - low) / 2);

  yield* integerSeries(next, high, xs);
};

const floatSeries: NumberSeriesFunction = function* (low, high) {
  if (low === high) {
    return;
  }

  if (low >= high - 0.0001) {
    if (high !== 0.000001) {
      yield low;
    }

    return;
  }

  yield low;

  const next = low + (high - low) / 2;
  yield* floatSeries(next, high);
};

const numberHelper = (makeSeries: NumberSeriesFunction) => (pivot: number): Generator<number> =>
  function* (num) {
    if (pivot === 0 && num === 0) {
      return;
    }

    // go toward pivot from negative but end at zero
    if (pivot >= 0 && num < 0) {
      for (let m of makeSeries(0, -num)) {
        yield -1 * m;
      }
      return;
    }

    // go toward pivot from positive but end at zero
    if (pivot < 0 && num >= 0) {
      yield* makeSeries(0, num);
      return;
    }

    // both pivot and n are positive, so n goes toward n
    if (pivot >= 0 && num >= 0) {
      if (num > pivot) {
        // pivot is less than n, so just start with pivot and go to n
        yield* makeSeries(pivot, num);
        return;
      } else {
        // pivot is greater than n, make them both negative so that
        // negative pivot is less than negative n (so that we start with
        // the pivot). make series, then map all by -1.
        for (let m of makeSeries(-pivot, -num)) {
          yield -1 * m;
        }
        return;
      }
    }

    if (pivot < 0 && num < 0) {
      if (num > pivot) {
        yield* makeSeries(pivot, num);
        return;
      } else {
        for (let m of makeSeries(-pivot, -num)) {
          yield -1 * m;
        }
        return;
      }
    }
  };

const integer = numberHelper(integerSeries);
const float = numberHelper(floatSeries);

const boolean = (bool: boolean) => {
  if (bool === true) {
    return [false];
  }

  return [];
};

function* tupleShrinkOne(generators: Generator<any>[], tuple: any[]): IterableIterator<any[]> {
  if (tuple.length !== generators.length || tuple.length === 0) {
    return;
  }

  const [head, ...tail] = tuple;
  const [headGen, ...tailGens] = generators;

  for (let a of headGen(head)) {
    yield [a, ...tail];
  }

  for (let arr of tupleShrinkOne(tailGens, tail)) {
    yield [head, ...arr];
  }
}

function* arrayRemove<T>(t: T[]) {
  function* removes(size: number, arrayLength: number, arr: T[]): IterableIterator<T[]> {
    if (size > arrayLength) {
      return;
    } else {
      const first = take(arr, size);
      const rest = drop(arr, size);
      const recursed = removes(size, arrayLength - size, rest);

      yield rest;

      for (let u of recursed) {
        yield [...u, ...first];
      }
    }
  }

  let len = t.length;
  const initLen = len;
  while (len > 0) {
    yield* removes(len, initLen, t);
    len = Math.floor(len / 2);
  }
}

const array = <T>(generator: Generator<T>): Generator<T[]> =>
  function* (value: T[]) {
    if (value.length === 0) {
      return;
    }

    const removable = arrayRemove(value);
    yield* removable;

    const generators = value.map(() => generator);

    const shrunkOne = tupleShrinkOne(generators, value);
    yield* shrunkOne;
  };

export class Shrink<T, U = T> {
  constructor(public readonly generator: Generator<T, U>) {}

  filter(fn: (t: U) => boolean): Shrink<T, U> {
    const generator = this.generator;

    return new Shrink(function* (value) {
      const arr: Iterable<U> = generator(value);

      for (let next of arr) {
        if (fn(next) === true) {
          yield next;
        }
      }
    });
  }

  map<V>(fn: (u: U) => V): Shrink<T, V> {
    const generator = this.generator;

    return new Shrink(function* (value) {
      const arr: Iterable<U> = generator(value);

      for (let next of arr) {
        yield fn(next);
      }
    });
  }

  noShrink(): Shrink<T> {
    return new Shrink((value) => []);
  }

  noEmpty(): Shrink<T, U> {
    const generator = this.generator;
    return new Shrink(function* (value) {
      for (let u of generator(value)) {
        if (!empty(u)) {
          yield u;
        }
      }
    });
  }

  maybe(): Shrink<T | undefined, U | undefined> {
    const generator = this.generator;
    return new Shrink(function* (value) {
      // short circuit because undefined can't be shrunk
      if (value === undefined) {
        return;
      }

      for (let u of generator(value)) {
        yield u;
      }
    });
  }

  nullable(): Shrink<T | null, U | null> {
    const generator = this.generator;
    return new Shrink(function* (value) {
      // short circuit because null can't be shrunk
      if (value === null) {
        return;
      }

      for (let u of generator(value)) {
        yield u;
      }
    });
  }

  convert<V>(vToT: (v: V) => T, uToV: (u: U) => V): Shrink<V> {
    const generator = this.generator;

    return new Shrink(function* (value) {
      const t = vToT(value);

      for (let u of generator(t)) {
        yield uToV(u);
      }
    });
  }

  iterable(t: T): Iterable<U> {
    return this.generator(t);
  }

  value(t: T): U[] {
    return Array.from(this.generator(t));
  }
}

export class ShrinkApi {
  noop<T>(): Shrink<T> {
    return new Shrink((value) => []);
  }

  integer(): Shrink<number> {
    return new Shrink(integer(0));
  }

  towardInteger(pivot: number): Shrink<number> {
    return new Shrink(integer(pivot));
  }

  atLeastInteger(pivot: number): Shrink<number> {
    return new Shrink(integer(pivot)).filter((x) => {
      if (pivot > 0) {
        return x >= pivot;
      } else if (pivot < 0) {
        return x <= pivot;
      } else {
        return true;
      }
    });
  }

  float(): Shrink<number> {
    return new Shrink(float(0));
  }

  towardFloat(pivot: number): Shrink<number> {
    return new Shrink(float(pivot));
  }

  atLeastFloat(pivot: number): Shrink<number> {
    return new Shrink(float(pivot)).filter((x) => {
      if (pivot > 0) {
        return x >= pivot;
      } else if (pivot < 0) {
        return x <= pivot;
      } else {
        return true;
      }
    });
  }

  boolean(): Shrink<boolean> {
    return new Shrink(boolean);
  }

  array<T>(shrink: Shrink<T>): Shrink<T[]> {
    return new Shrink(array(shrink.generator));
  }

  character(): Shrink<string> {
    return this.atLeastInteger(32).convert(
      (str) => str.charCodeAt(0),
      (num) => String.fromCharCode(num)
    );
  }

  string(): Shrink<string> {
    return this.array(this.character()).convert(
      (str) => str.split(""),
      (arr) => arr.join("")
    );
  }

  tuple<U>(arr: [Shrink<U>]): Shrink<[U]>;
  tuple<U, V>(arr: [Shrink<U>, Shrink<V>]): Shrink<[U, V]>;
  tuple<U, V, W>(arr: [Shrink<U, U>, Shrink<V, V>, Shrink<W, W>]): Shrink<[U, V, W]>;
  tuple<U, V, W, X>(arr: [Shrink<U>, Shrink<V>, Shrink<W>, Shrink<X>]): Shrink<[U, V, W, X]>;
  tuple<U, V, W, X, Y>(
    arr: [Shrink<U, U>, Shrink<V>, Shrink<W>, Shrink<X>, Shrink<Y>]
  ): Shrink<[U, V, W, X, Y]>;
  tuple<U, V, W, X, Y, Z>(
    arr: [Shrink<U>, Shrink<V>, Shrink<W>, Shrink<X>, Shrink<Y>, Shrink<Z>]
  ): Shrink<[U, V, W, X, Y, Z]>;
  tuple<T>(arr: Shrink<T>[]): Shrink<T[]>;
  tuple(arr: Shrink<any>[]): Shrink<any> {
    return new Shrink(function* (value) {
      const generators = arr.map((shrink) => shrink.generator);
      yield* tupleShrinkOne(generators, value);
    });
  }

  object<T>(obj: { [K in keyof T]: Shrink<T[K]> }): Shrink<T> {
    const keys = Object.keys(obj) as (keyof T)[];
    const shrinkers = keys.map((key) => obj[key]);

    return this.tuple(shrinkers).convert(
      (obj) => keys.map((key) => obj[key]),
      (values) => keys.reduce((acc, key, i) => Object.assign(acc, { [key]: values[i] }), {} as T)
    );
  }
}

export default new ShrinkApi();
