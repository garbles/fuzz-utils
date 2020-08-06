type Then<U> = <T extends U>(this: Random<T>, resolve: (t: T) => T) => Promise<T>;

export type Seed = {
  state: number;
  increment: number;
};

export type NextState<T> = [T, Seed];
export type RandomGenerator<T> = (size: number, seed: Seed) => Promise<NextState<T>>;

export type RandomOptions = {
  seed: number | Seed;
  maxSize: number;
};

type RejectToken = { "__@FUZZ_UTILS/RANDOM__REJECT_TOKEN__": true };
const REJECT: RejectToken = { "__@FUZZ_UTILS/RANDOM__REJECT_TOKEN__": true };

const empty = (obj: any) => !!obj === false || obj.length === 0;

const isSeed = (obj: any): obj is Seed =>
  obj !== undefined && typeof obj.state === "number" && typeof obj.increment === "number";

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

const byte = async (size: number, seed: Seed) => integer(0, 255, seed);

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

const boolean: RandomGenerator<boolean> = async (size, seed) => {
  if (size === 0) {
    return [false, seed];
  }

  const [num, nextSeed] = integer(0, 1, seed);
  return [num === 1, nextSeed];
};

const array = <T>(min: number, gen: RandomGenerator<T>): RandomGenerator<T[]> => {
  return async (size, seed) => {
    let i = -1;
    let xs: T[] = [];

    [size, seed] = integer(min, size, seed);

    while (++i < size) {
      const [nextValue, nextSeed] = await gen(size, seed);
      seed = nextSeed;
      xs = xs.concat(nextValue);
    }

    return [xs, seed];
  };
};

const constant = <T>(value: T): RandomGenerator<T> => async (size, seed) => {
  return [value, seed];
};

const frequency = <T>(contexts: [number, RandomGenerator<T>][]): RandomGenerator<T> => {
  const arr: RandomGenerator<T>[] = [];

  for (let context of contexts) {
    let [count, generator] = context;
    let i = -1;

    while (++i < count) {
      arr.push(generator);
    }
  }

  return async (size, seed) => {
    let index: number;
    [index, seed] = integer(0, arr.length - 1, seed);
    return arr[index](size, seed);
  };
};

export class Random<T, U = T> {
  static return<U>(value: U | Random<U>, then: Then<U>): Random<U> {
    if (!(value instanceof Random)) {
      return new Random(constant(value), then);
    }

    return value;
  }

  constructor(
    public readonly generator: RandomGenerator<T>,
    public readonly then: Then<U> = then
  ) {}

  filter(fn: (t: T) => boolean, maxTries = 1e4): Random<T> {
    return new Random(async (size, seed) => {
      let value: T;
      let tries = (maxTries || 1e4) - 1;
      [value, seed] = await this.generator(size, seed);

      while (fn(value) === false) {
        tries -= 1;

        if (tries < 0) {
          throw new Error(`Could not satisfy filter in ${maxTries} tries.`);
        }

        [value, seed] = await this.generator(size, seed);
      }

      return [value, seed];
    }, this.then);
  }

  map<U>(fn: (t: T) => U): Random<U> {
    return new Random(async (size, seed) => {
      let value: T;
      [value, seed] = await this.generator(size, seed);
      return [fn(value), seed];
    }, this.then);
  }

  filterMap<U>(fn: (t: T, r: RejectToken) => U | RejectToken): Random<U> {
    return this.map((v) => fn(v, REJECT)).filter((v) => v !== REJECT) as Random<U>;
  }

  bind<U>(fn: (t: T) => Random<U>): Random<U> {
    return new Random(async (size, seed) => {
      let value: T;
      [value, seed] = await this.generator(size, seed);
      const context = fn(value);
      return context.generator(size, seed);
    }, this.then);
  }

  skip(count: number): Random<T> {
    return new Random(async (size, seed) => {
      let i = -1;

      while (++i < count) {
        seed = nextSeed(seed);
      }

      return this.generator(size, seed);
    }, this.then);
  }

  memoize(): Random<T> {
    const cache: { [seed: string]: NextState<T> } = {};

    return new Random(async (size, seed) => {
      const key = `${seed.increment}_${seed.state}_${size}`;

      if (cache[key] !== undefined) {
        return cache[key];
      } else {
        const result = await this.generator(size, seed);
        cache[key] = result;

        return result;
      }
    }, this.then);
  }

  noEmpty(): Random<T> {
    return new Random(async (size, seed) => {
      let value: T;
      const tempSize = size === 0 ? 1 : size;

      [value, seed] = await this.generator(tempSize, seed);

      while (empty(value)) {
        [value, seed] = await this.generator(tempSize, seed);
      }

      return [value, seed];
    }, this.then);
  }

  maybe(n = 4): Random<T | undefined> {
    const nn = n < 1 ? 1 : n;

    const generator = frequency([
      [nn - 1, this.generator],
      [1, constant(undefined)],
    ]);
    return new Random(generator, this.then);
  }

  nullable(n = 4): Random<T | null> {
    const nn = n < 1 ? 1 : n;

    const generator = frequency([
      [nn - 1, this.generator],
      [1, constant(null)],
    ]);
    return new Random(generator, this.then);
  }

  resize(maxSize: number): Random<T> {
    return new Random(async (size, seed) => this.generator(maxSize, seed), this.then);
  }

  composeMap<U, V>(u: Random<U>, fn: (t: T, u: U) => V): Random<V>;
  composeMap<U, V, W>(u: Random<U>, v: Random<V>, fn: (t: T, u: U, v: V) => W): Random<W>;
  composeMap<U, V, W, X>(
    u: Random<U>,
    v: Random<V>,
    w: Random<W>,
    fn: (t: T, u: U, v: V, w: W) => X
  ): Random<X>;
  composeMap<U, V, W, X, Y>(
    u: Random<U>,
    v: Random<V>,
    w: Random<W>,
    x: Random<X>,
    fn: (t: T, u: U, v: V, w: W, x: X) => Y
  ): Random<Y>;
  composeMap(...args: any[]): Random<any> {
    return new Random(async (size, seed) => {
      const last = args.length - 1;
      const rands = args.slice(0, last);
      const [fn] = args.slice(last);

      let nextSeed = seed;
      let t: T;
      [t, nextSeed] = await this.generator(size, nextSeed);

      const fnArgs: any[] = [t];

      for (let rand of rands) {
        let value: any;
        [value, nextSeed] = await rand.generator(size, nextSeed);
        fnArgs.push(value);
      }

      const result = fn(...fnArgs);

      return [result, nextSeed];
    }, this.then);
  }

  async *toIterator(options: Partial<RandomOptions> = {}): AsyncGenerator<T> {
    let { seed, maxSize } = options;

    while (true) {
      let next: T;
      [next, seed] = await this.sample({ seed, maxSize });
      yield next;
    }
  }

  async sample(options: Partial<RandomOptions> = {}): Promise<[T, Seed]> {
    let { seed = Math.round(Math.random() * 1e10), maxSize = 100 } = options;
    let seed_ = isSeed(seed) ? seed : initialSeed(seed);
    const [value, nextSeed] = await this.generator(maxSize, seed_);

    return [value, nextSeed];
  }
}

export class RandomApi {
  constructor(private then: Then<any>) {}

  return<T>(value: T): Random<T> {
    return new Random(constant(value), this.then);
  }

  integer(): Random<number> {
    return new Random(async (size, seed) => integer(-size, size, seed), this.then);
  }

  integerWithin(min = -1e3, max = 1e3): Random<number> {
    return new Random(async (size, seed) => {
      let [value, nextSeed] = integer(min, max, seed);
      return [value, nextSeed];
    }, this.then);
  }

  posInteger(): Random<number> {
    return new Random(async (size, seed) => integer(0, size, seed), this.then);
  }

  negInteger(): Random<number> {
    return new Random(async (size, seed) => integer(-size, 0, seed), this.then);
  }

  float(): Random<number> {
    return new Random(async (size, seed) => float(-size, size, seed), this.then);
  }

  posFloat(): Random<number> {
    return new Random(async (size, seed) => float(0, size, seed), this.then);
  }

  negFloat(): Random<number> {
    return new Random(async (size, seed) => float(-size, 0, seed), this.then);
  }

  floatWithin(min = -1e3, max = 1e3): Random<number> {
    return new Random(async (size, seed) => {
      let [value, nextSeed] = float(min, max, seed);
      return [value, nextSeed];
    }, this.then);
  }

  boolean(): Random<boolean> {
    return new Random(boolean, this.then);
  }

  character(): Random<string> {
    return new Random(async (size, seed) => integer(32, 126, seed), this.then).map((i) =>
      String.fromCharCode(i)
    );
  }

  whitespace(): Random<string> {
    return this.oneOf([" ", "\t", "\n"]);
  }

  string(): Random<string> {
    return this.array(this.character()).map((arr) => arr.join(""));
  }

  byte(): Random<number> {
    return new Random(byte, this.then);
  }

  uuid(): Random<string> {
    const bytesGen = (seed: Seed) => array(16, byte)(16, seed);

    return new Random(async (size, seed) => {
      const [bytes, nextSeed] = await bytesGen(seed);
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
    }, this.then);
  }

  seed(): Random<Seed> {
    return new Random(async (size, seed) => {
      const [a, b] = split(seed);
      return [a, b];
    }, this.then);
  }

  array<T>(context: Random<T>): Random<T[]> {
    return new Random(array(0, context.generator), this.then);
  }

  frequency<T>(contexts: [number, Random<T>][]): Random<T> {
    const generators = contexts.map((c) => [c[0], c[1].generator] as [number, RandomGenerator<T>]);
    return new Random(frequency(generators), this.then);
  }

  oneOf<T>(sample: (T | Random<T>)[]): Random<T> {
    const arr = sample.map((v) => Random.return(v, this.then));

    return this.posInteger()
      .resize(arr.length - 1)
      .bind((i) => arr[i]);
  }

  tuple<U>(sample: [U | Random<U>]): Random<[U]>;
  tuple<U, V>(sample: [U | Random<U>, V | Random<V>]): Random<[U, V]>;
  tuple<U, V, W>(sample: [U | Random<U>, V | Random<V>, W | Random<W>]): Random<[U, V, W]>;
  tuple<U, V, W, X>(
    sample: [U | Random<U>, V | Random<V>, W | Random<W>, X | Random<X>]
  ): Random<[U, V, W, X]>;
  tuple<U, V, W, X, Y>(
    sample: [U | Random<U>, V | Random<V>, W | Random<W>, X | Random<X>, Y | Random<Y>]
  ): Random<[U, V, W, X, Y]>;
  tuple<U, V, W, X, Y, Z>(
    sample: [
      U | Random<U>,
      V | Random<V>,
      W | Random<W>,
      X | Random<X>,
      Y | Random<Y>,
      Z | Random<Z>
    ]
  ): Random<[U, V, W, X, Y, Z]>;
  tuple<U>(sample: (U | Random<U>)[]): Random<U[]>;
  tuple(sample: (any | Random<any>)[]): Random<any[]> {
    const arr = sample.map((v) => Random.return(v, this.then));

    return new Random(async (size, seed) => {
      const value: any[] = [];

      for (let i = 0; i < arr.length; i++) {
        const result = await arr[i].generator(size, seed);

        value[i] = result[0];
        seed = result[1];
      }

      return [value, seed];
    }, this.then);
  }

  object<T>(obj: { [K in keyof T]: T[K] | Random<T[K]> }): Random<T> {
    const keys = Object.keys(obj) as (keyof T)[];
    const rands = keys.map((k) => Random.return(obj[k], this.then)) as Random<T[keyof T]>[];

    return this.tuple(rands).map((values) =>
      keys.reduce((acc, key, i) => Object.assign(acc, { [key]: values[i] }), {} as T)
    );
  }

  lazy<T>(fn: () => Random<T>) {
    return this.return(undefined).bind(fn);
  }

  deref<T>(fn: (api: RandomApi) => Promise<T>): Random<T> {
    return new Random(async (size, seed) => {
      let nextSeed = seed;

      async function then<T>(this: Random<T>, fn: (t: T) => T): Promise<T> {
        let value: T;
        [value, nextSeed] = await this.sample({ seed: nextSeed, maxSize: size });
        return fn(value);
      }

      const api = new RandomApi(then);
      const result = await fn(api);

      return [result, nextSeed];
    }, this.then);
  }
}

function then<T>(this: Random<T>, fn: (t: T) => T): Promise<T> {
  return this.sample().then((res) => fn(res[0]));
}

export default new RandomApi(then);
