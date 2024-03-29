type NextState<T> = [T, Seed];
export type RandomValueGenerator<T> = (size: number, seed: Seed) => NextState<T>;

export type Seed = {
  state: number;
  increment: number;
};

type SampleOptions = {
  seed: number | Seed;
  maxSize: number;
};

export type RandomToGeneratorOptions = SampleOptions & { count: number };

const empty = (obj: any) => !!obj === false || obj.length === 0;

const isSeed = (obj: any): obj is Seed => obj !== undefined && typeof obj.state === "number" && typeof obj.increment === "number";

const nextSeed = (seed: Seed): Seed => {
  const { state, increment } = seed;
  const nextState = (state * 1664525 + increment) >>> 0;
  return { state: nextState, increment };
};

const peel = (seed: Seed): number => {
  const { state } = seed;
  const word = ((state >>> ((state >>> 28) + 4)) ^ state) * 277803737;
  return ((word >>> 22) | word) >>> 0;
};

const initialSeed = (x: number): Seed => {
  const seed: Seed = nextSeed({ state: x >>> 0, increment: 1013904223 });
  return nextSeed(seed);
};

const split = (seed0: Seed): [Seed, Seed] => {
  const [state, seed1] = integer(0, 0xffffffff, seed0);
  const [incrementA, seed2] = integer(0, 0xffffffff, seed1);
  const [incrementB, seed3] = integer(0, 0xffffffff, seed2);
  const increment = (incrementA ^ incrementB) | (1 >> 0);

  return [seed3, nextSeed({ state, increment })];
};

const integer = (a: number, b: number, seed: Seed): NextState<number> => {
  let min: number;
  let max: number;

  if (a < b) {
    min = a;
    max = b;
  } else {
    min = b;
    max = a;
  }

  const range = max - min + 1;

  if (((range - 1) & range) === 0) {
    const value = ((peel(seed) & (range - 1)) >>> 0) + min;
    return [value, nextSeed(seed)];
  }

  const threshold = (-range >>> 0) % range >>> 0;

  const accountForBias = (s: Seed): NextState<number> => {
    const x = peel(s);
    const next = nextSeed(s);

    if (x < threshold) {
      return accountForBias(next);
    } else {
      return [(x % range) + min, next];
    }
  };

  return accountForBias(seed);
};

const byte = (size: number, seed: Seed) => integer(0, 255, seed);

const float = (min: number, max: number, seed: Seed): NextState<number> => {
  const bit53 = 9007199254740992;
  const bit27 = 134217728;
  const next = nextSeed(seed);
  const n0 = peel(seed);
  const n1 = peel(next);

  const high = n0 & 0x03ffffff;
  const low = n1 & 0x07ffffff;

  const val = (high * bit27 + low) / bit53;
  const range = Math.abs(max - min);
  const scaled = val * range + min;

  return [scaled, nextSeed(next)];
};

const boolean: RandomValueGenerator<boolean> = (size, seed) => {
  if (size === 0) {
    return [false, seed];
  }

  const [num, nextSeed] = integer(0, 1, seed);
  return [num === 1, nextSeed];
};

const array = <T>(min: number, gen: RandomValueGenerator<T>): RandomValueGenerator<T[]> => {
  return (size, seed) => {
    let i = -1;
    let xs: T[] = [];

    [size, seed] = integer(min, size, seed);

    while (++i < size) {
      const [nextValue, nextSeed] = gen(size, seed);
      seed = nextSeed;
      xs = xs.concat(nextValue);
    }

    return [xs, seed];
  };
};

const constant =
  <T>(value: T): RandomValueGenerator<T> =>
  (size, seed) => {
    return [value, seed];
  };

const frequency = <T>(contexts: [number, RandomValueGenerator<T>][]): RandomValueGenerator<T> => {
  const arr: RandomValueGenerator<T>[] = [];

  for (let context of contexts) {
    let [count, generator] = context;
    let i = -1;

    while (++i < count) {
      arr.push(generator);
    }
  }

  return (size, seed) => {
    let index: number;
    [index, seed] = integer(0, arr.length - 1, seed);
    return arr[index](size, seed);
  };
};

export class Random<T> {
  static return<U>(value: U | Random<U>): Random<U> {
    if (value instanceof Random) {
      return value;
    }

    return new Random(constant(value));
  }

  constructor(public readonly generator: RandomValueGenerator<T>) {}

  filter(fn: (t: T) => boolean, maxTries = 1e4): Random<T> {
    return new Random((size, seed) => {
      let value: T;
      let tries = (maxTries || 1e4) - 1;
      [value, seed] = this.generator(size, seed);

      while (fn(value) === false) {
        tries -= 1;

        if (tries < 0) {
          throw new Error(`Could not satisfy filter in ${maxTries} tries.`);
        }

        [value, seed] = this.generator(size, seed);
      }

      return [value, seed];
    });
  }

  map<U>(fn: (t: T) => U): Random<U> {
    return new Random((size, seed) => {
      let value: T;
      [value, seed] = this.generator(size, seed);
      return [fn(value), seed];
    });
  }

  bind<U>(fn: (t: T) => Random<U>): Random<U> {
    return new Random((size, seed) => {
      let value: T;
      [value, seed] = this.generator(size, seed);
      const context = fn(value);
      return context.generator(size, seed);
    });
  }

  skip(count: number): Random<T> {
    return new Random((size, seed) => {
      let i = -1;

      while (++i < count) {
        seed = nextSeed(seed);
      }

      return this.generator(size, seed);
    });
  }

  memoize(): Random<T> {
    const cache: { [seed: string]: NextState<T> } = {};

    return new Random((size, seed) => {
      const key = `${seed.increment}_${seed.state}_${size}`;

      if (cache[key] !== undefined) {
        return cache[key];
      } else {
        const result = this.generator(size, seed);
        cache[key] = result;

        return result;
      }
    });
  }

  noEmpty(): Random<T> {
    return new Random((size, seed) => {
      let value: T;
      const tempSize = size === 0 ? 1 : size;

      [value, seed] = this.generator(tempSize, seed);

      while (empty(value)) {
        [value, seed] = this.generator(tempSize, seed);
      }

      return [value, seed];
    });
  }

  maybe(n = 4): Random<T | undefined> {
    const nn = n < 1 ? 1 : n;

    const generator = frequency([
      [nn - 1, this.generator],
      [1, constant(undefined)],
    ]);
    return new Random(generator);
  }

  nullable(n = 4): Random<T | null> {
    const nn = n < 1 ? 1 : n;

    const generator = frequency([
      [nn - 1, this.generator],
      [1, constant(null)],
    ]);
    return new Random(generator);
  }

  resize(maxSize: number): Random<T> {
    return new Random((size, seed) => this.generator(maxSize, seed));
  }

  composeMap<U, V>(u: Random<U>, fn: (t: T, u: U) => V): Random<V>;
  composeMap<U, V, W>(u: Random<U>, v: Random<V>, fn: (t: T, u: U, v: V) => W): Random<W>;
  composeMap<U, V, W, X>(u: Random<U>, v: Random<V>, w: Random<W>, fn: (t: T, u: U, v: V, w: W) => X): Random<X>;
  composeMap<U, V, W, X, Y>(u: Random<U>, v: Random<V>, w: Random<W>, x: Random<X>, fn: (t: T, u: U, v: V, w: W, x: X) => Y): Random<Y>;
  composeMap(...args: any[]): Random<any> {
    return new Random((size, seed) => {
      const last = args.length - 1;
      const rands = args.slice(0, last);
      const [fn] = args.slice(last);

      let nextSeed = seed;
      let t: T;
      [t, nextSeed] = this.generator(size, nextSeed);

      const fnArgs = rands.reduce(
        (acc, rand) => {
          let value: any;
          [value, nextSeed] = rand.generator(size, nextSeed);
          return acc.concat(value);
        },
        [t]
      );

      const result = fn(...fnArgs);

      return [result, nextSeed];
    });
  }

  *toGenerator(options: Partial<RandomToGeneratorOptions> = {}): Generator<T> {
    let { seed, maxSize, count: maxLength = Infinity } = options;
    let currentLength = 0;

    while (currentLength++ < maxLength) {
      let next: T;
      [next, seed] = this.sample({ seed, maxSize });
      yield next;
    }
  }

  sample(options: Partial<SampleOptions> = {}): [T, Seed] {
    let { seed = Date.now(), maxSize = 100 } = options;
    let seed_ = isSeed(seed) ? seed : initialSeed(seed);
    const [value, nextSeed] = this.generator(maxSize, seed_);

    return [value, nextSeed];
  }
}

export class RandomApi {
  return<T>(value: T): Random<T> {
    return new Random(constant(value));
  }

  integer(): Random<number> {
    return new Random((size, seed) => integer(-size, size, seed));
  }

  integerWithin(min = -1e3, max = 1e3): Random<number> {
    return new Random((size, seed) => {
      let [value, nextSeed] = integer(min, max, seed);
      return [value, nextSeed];
    });
  }

  posInteger(): Random<number> {
    return new Random((size, seed) => integer(0, size, seed));
  }

  negInteger(): Random<number> {
    return new Random((size, seed) => integer(-size, 0, seed));
  }

  float(): Random<number> {
    return new Random((size, seed) => float(-size, size, seed));
  }

  posFloat(): Random<number> {
    return new Random((size, seed) => float(0, size, seed));
  }

  negFloat(): Random<number> {
    return new Random((size, seed) => float(-size, 0, seed));
  }

  floatWithin(min = -1e3, max = 1e3): Random<number> {
    return new Random((size, seed) => {
      let [value, nextSeed] = float(min, max, seed);
      return [value, nextSeed];
    });
  }

  boolean(): Random<boolean> {
    return new Random(boolean);
  }

  character(): Random<string> {
    return new Random((size, seed) => integer(32, 126, seed)).map((i) => String.fromCharCode(i));
  }

  whitespace(): Random<string> {
    return this.oneOf([" ", "\t", "\n"]);
  }

  string(): Random<string> {
    return this.array(this.character()).map((arr) => arr.join(""));
  }

  byte(): Random<number> {
    return new Random(byte);
  }

  uuid(): Random<string> {
    const bytesGen = (seed: Seed) => array(16, byte)(16, seed);

    return new Random((size, seed) => {
      const [bytes, nextSeed] = bytesGen(seed);
      const strs = bytes.map((b) => ("0" + b.toString(16)).slice(-2));

      // prettier-ignore
      const value = (
        strs.slice(0, 4).join('') + '-' +
        strs.slice(4,6).join('') + '-' +
        '4' + strs.slice(6,8).join('').slice(1) + '-' +
        strs.slice(8, 10).join('') + '-' +
        strs.slice(10, 16).join('')
      );

      return [value, nextSeed];
    });
  }

  seed(): Random<Seed> {
    return new Random((size, seed) => {
      const [a, b] = split(seed);
      return [a, b];
    });
  }

  array<T>(context: Random<T>): Random<T[]> {
    return new Random(array(0, context.generator));
  }

  frequency<T>(contexts: [number, Random<T>][]): Random<T> {
    const generators = contexts.map((c) => [c[0], c[1].generator] as [number, RandomValueGenerator<T>]);
    return new Random(frequency(generators));
  }

  oneOf<T>(sample: (T | Random<T>)[]): Random<T> {
    const arr = sample.map((v) => Random.return(v));

    return this.posInteger()
      .resize(arr.length - 1)
      .bind((i) => arr[i]);
  }

  tuple<U>(sample: [U | Random<U>]): Random<[U]>;
  tuple<U, V>(sample: [U | Random<U>, V | Random<V>]): Random<[U, V]>;
  tuple<U, V, W>(sample: [U | Random<U>, V | Random<V>, W | Random<W>]): Random<[U, V, W]>;
  tuple<U, V, W, X>(sample: [U | Random<U>, V | Random<V>, W | Random<W>, X | Random<X>]): Random<[U, V, W, X]>;
  tuple<U, V, W, X, Y>(sample: [U | Random<U>, V | Random<V>, W | Random<W>, X | Random<X>, Y | Random<Y>]): Random<[U, V, W, X, Y]>;
  tuple<U, V, W, X, Y, Z>(
    sample: [U | Random<U>, V | Random<V>, W | Random<W>, X | Random<X>, Y | Random<Y>, Z | Random<Z>]
  ): Random<[U, V, W, X, Y, Z]>;
  tuple<U>(sample: (U | Random<U>)[]): Random<U[]>;
  tuple(sample: (any | Random<any>)[]): Random<any[]> {
    const arr = sample.map((v) => Random.return(v));

    return new Random((size, seed) => {
      const value: any[] = [];

      for (let i = 0; i < arr.length; i++) {
        const result = arr[i].generator(size, seed) as NextState<any>;

        value[i] = result[0];
        seed = result[1];
      }

      return [value, seed];
    });
  }

  object<T>(obj: { [K in keyof T]: T[K] | Random<T[K]> }): Random<T> {
    const keys = Object.keys(obj) as (keyof T)[];
    const rands = keys.map((k) => Random.return(obj[k])) as Random<T[keyof T]>[];

    return this.tuple(rands).map((values) => keys.reduce((acc, key, i) => Object.assign(acc, { [key]: values[i] }), {} as T));
  }

  lazy<T>(fn: () => Random<T>) {
    return this.return(undefined).bind(fn);
  }
}

export const random = new RandomApi();
