import rand, { Random, Seed } from "@fuzz-utils/random";
import sh, { Shrink } from "@fuzz-utils/shrink";

type Filter = { __FILTER__: true };

type Generator<T, U> = (size: number, seed: Seed) => [Random<T>, Shrink<T>, Seed, FilterMap<T, U>];

const FILTER: Filter = { __FILTER__: true };

const isObject = (obj: any): obj is object =>
  Object.prototype.toString.call(obj) === "[object Object]";
const isFilter = (obj: any): obj is Filter => isObject(obj) && "__FILTER__" in obj;

const biasedRandomNumber = (
  isPositive: boolean,
  isNegative: boolean,
  isInteger: boolean
): Random<number> => {
  const posNumber = isInteger ? rand.posInteger().noEmpty() : rand.posFloat().noEmpty();
  const negNumber = isInteger ? rand.negInteger().noEmpty() : rand.negFloat().noEmpty();
  const number = isInteger ? rand.integer().noEmpty() : rand.float().noEmpty();

  return new Random((size, seed) => {
    const gens: [number, Random<number>][] = [[1, rand.return(0)]];

    if (isPositive && size > 0) {
      gens.push([1, rand.return(size)]);
    }

    if (isNegative && size > 0) {
      gens.push([1, rand.return(-size)]);
    }

    if (isPositive && !isNegative && size > 0) {
      gens.push([6, posNumber]);
    }

    if (isNegative && !isPositive && size > 0) {
      gens.push([6, negNumber]);
    }

    if (isPositive && isNegative && size > 0) {
      gens.push([6, number]);
    }

    if (isPositive && size > 50) {
      gens.push([3, posNumber.resize(50)]);
    }

    if (isNegative && size > 50) {
      gens.push([3, negNumber.resize(50)]);
    }

    return rand.frequency(gens).generator(size, seed);
  });
};

const biasedRandomString = (): Random<string> =>
  new Random((size, seed) => {
    const gens: [number, Random<string>][] = [[1, rand.return("")]];

    if (size > 0) {
      gens.push([1, rand.whitespace()]);

      if (size <= 10) {
        gens.push([8, rand.string().noEmpty()]);
      } else if (size <= 50) {
        gens.push([
          5,
          rand
            .string()
            .resize(10)
            .noEmpty()
        ]);
        gens.push([3, rand.string().filter(s => s.length > 10)]);
      } else {
        // size > 50
        gens.push([
          5,
          rand
            .string()
            .resize(10)
            .noEmpty()
        ]);
        gens.push([
          2,
          rand
            .string()
            .resize(50)
            .filter(s => s.length > 10)
        ]);
        gens.push([1, rand.string().filter(s => s.length > 50)]);
      }
    }

    return rand.frequency(gens).generator(size, seed);
  });

export class RoseTree<T, U> {
  constructor(
    private pair: [T, U],
    private shrink: Shrink<T, T>,
    private filterMap: FilterMap<T, U>
  ) {}

  public value(): U {
    return this.pair[1];
  }

  public *children() {
    const iterator = this.shrink.value(this.pair[0]);

    for (let next of iterator) {
      const value = this.filterMap.apply(next);

      if (!isFilter(value)) {
        yield new RoseTree([next, value], this.shrink, this.filterMap);
      }
    }
  }
}

class FilterMap<T, U> {
  static tuple<A, B>(arr: [FilterMap<A, B>]): FilterMap<[A], [B]>;
  static tuple<A, B, C, D>(arr: [FilterMap<A, B>, FilterMap<C, D>]): FilterMap<[A, C], [B, D]>;
  static tuple<A, B, C, D, E, F>(
    arr: [FilterMap<A, B>, FilterMap<C, D>, FilterMap<E, F>]
  ): FilterMap<[A, C, E], [B, D, F]>;
  static tuple<A, B, C, D, E, F, G, H>(
    arr: [FilterMap<A, B>, FilterMap<C, D>, FilterMap<E, F>, FilterMap<G, H>]
  ): FilterMap<[A, C, E, G], [B, D, F, H]>;
  static tuple<A, B, C, D, E, F, G, H, I, J>(
    arr: [FilterMap<A, B>, FilterMap<C, D>, FilterMap<E, F>, FilterMap<G, H>, FilterMap<I, J>]
  ): FilterMap<[A, C, E, G, I], [B, D, F, H, J]>;
  static tuple<A, B, C, D, E, F, G, H, I, J, K, L>(
    arr: [
      FilterMap<A, B>,
      FilterMap<C, D>,
      FilterMap<E, F>,
      FilterMap<G, H>,
      FilterMap<I, J>,
      FilterMap<K, L>
    ]
  ): FilterMap<[A, C, E, G, I, K], [B, D, F, H, J, L]>;
  static tuple<T, U>(arr: FilterMap<T, U>[]): FilterMap<T[], U[]>;
  static tuple(filterMaps: FilterMap<any, any>[]): FilterMap<any, any> {
    return new FilterMap(values => {
      const results: any[] = Array(values.length);

      for (let i = 0; i < values.length; i++) {
        const result = filterMaps[i].apply(values[i]);

        /**
         * If the result of a single filterMap is to filter out,
         * then the whole thing should be filtered out.
         */
        if (isFilter(result)) {
          return FILTER;
        } else {
          results[i] = result;
        }
      }

      return results;
    });
  }

  static object<T>(obj: { [K in keyof T]: FilterMap<any, T[K]> }): FilterMap<any, T> {
    const keys = Object.keys(obj) as (keyof T)[];

    return new FilterMap(value => {
      const results = {} as T;

      for (let key of keys) {
        const result = obj[key].apply(value[key]);

        if (isFilter(result)) {
          return FILTER;
        } else {
          results[key] = result;
        }
      }

      return results;
    });
  }

  constructor(public apply: (t: T) => U | Filter) {}

  filter(fn: (u: U) => boolean): FilterMap<T, U> {
    return new FilterMap(value => {
      const result = this.apply(value);

      if (isFilter(result) || fn(result) !== true) {
        return FILTER;
      } else {
        return result;
      }
    });
  }

  map<V>(fn: (u: U) => V): FilterMap<T, V> {
    return new FilterMap(value => {
      const result = this.apply(value);

      if (isFilter(result)) {
        return result;
      } else {
        return fn(result);
      }
    });
  }

  toArray(): FilterMap<T[], U[]> {
    return new FilterMap(value => {
      const result = value.map(v => this.apply(v));
      return result.reduce((acc, u) => (isFilter(u) ? acc : acc.concat(u)), [] as U[]);
    });
  }

  maybe(): FilterMap<T | undefined, U | undefined> {
    return new FilterMap(value => {
      // TODO: unclear why we can't return this.apply(value)
      return value === undefined ? undefined : (this.apply(value) as any);
    });
  }

  nullable(): FilterMap<T | null, U | null> {
    return new FilterMap(value => {
      // TODO: unclear why we can't return this.apply(value)
      return value === null ? null : (this.apply(value) as any);
    });
  }
}

export class Fuzz<T, U> {
  static is(obj: any): obj is Fuzz<any, any> {
    return obj instanceof Fuzz;
  }

  static from<T>(random: Random<T>, shrink: Shrink<T>): Fuzz<T, T> {
    return new Fuzz((size, seed) => {
      const filterMap = new FilterMap<T, T>(x => x);
      return [random, shrink, seed, filterMap];
    });
  }

  constructor(public readonly generator: Generator<T, U>) {}

  /**
   * Maps the inner value to a new value.
   * @param fn Map function
   */
  map<V>(fn: (u: U) => V): Fuzz<T, V> {
    return new Fuzz((size, seed) => {
      const [random, shrink, nextSeed, filterMap] = this.generator(size, seed);
      const nextFilterMap = filterMap.map(fn);
      return [random, shrink, nextSeed, nextFilterMap];
    });
  }

  /**
   * Merges two fuzzers into a single fuzzer
   * @param fuzz Fuzz to be merged
   * @param fn Mapping function to merge both values
   */
  merge<V, W, X>(fuzz: Fuzz<V, W>, fn: (u: U, w: W) => X): Fuzz<[T, V], X> {
    return new Fuzz((size, seed) => {
      const [randomT, shrinkT, seed2, filterMapT] = this.generator(size, seed);
      const [randomV, shrinkV, seed3, filterMapV] = fuzz.generator(size, seed2);

      const nextRandom = rand.tuple([randomT, randomV]);
      const nextShrink = sh.tuple([shrinkT, shrinkV]);

      const nextFilterMap: FilterMap<[T, V], X> = new FilterMap(value => {
        const [t, v] = value;
        const u = filterMapT.apply(t);
        const w = filterMapV.apply(v);

        if (isFilter(u) || isFilter(w)) {
          return FILTER;
        }

        return fn(u, w);
      });

      return [nextRandom, nextShrink, seed3, nextFilterMap];
    });
  }

  /**
   * Filters out any value or shrinken value that does not return true.
   * @param fn Filter function
   */
  suchThat(fn: (u: U) => boolean): Fuzz<T, U> {
    return new Fuzz((size, seed) => {
      const [random, shrink, nextSeed, filterMap] = this.generator(size, seed);
      const nextFilterMap = filterMap.filter(fn);
      return [random, shrink, nextSeed, nextFilterMap];
    });
  }
  filter = this.suchThat;

  /**
   * The result value will not shrink.
   */
  noShrink(): Fuzz<T, U> {
    return new Fuzz((size, seed) => {
      const [random, shrink, nextSeed, filterMap] = this.generator(size, seed);
      return [random, shrink.noShrink(), nextSeed, filterMap];
    });
  }

  /**
   * Prevents empty values from being generated. Does not recursively apply
   * on higher order fuzzers (such as object). Empty values include anything
   * that matches `!!value === false` or `value.length === 0`.
   */
  noEmpty(): Fuzz<T, U> {
    return new Fuzz((size, seed) => {
      const [random, shrink, nextSeed, filterMap] = this.generator(size, seed);
      return [random.noEmpty(), shrink.noEmpty(), nextSeed, filterMap];
    });
  }

  /**
   * Changes a fuzzer from always return a value to returning a value or `undefined`.
   * 1 out of every n times, it will return `undefined`.
   * @param n the number of generated values where one value is _likely_ to be `undefined`.
   */
  maybe(n = 4): Fuzz<T | undefined, U | undefined> {
    return new Fuzz((size, seed) => {
      const [random, shrink, nextSeed, filterMap] = this.generator(size, seed);
      return [random.maybe(n), shrink.maybe(), nextSeed, filterMap.maybe()];
    });
  }

  /**
   * Changes a fuzzer from always return a value to returning a value or `null`.
   * 1 out of every n times, it will return `null`.
   * @param n the number of generated values where one value is _likely_ to be `null`.
   */
  nullable(n = 4): Fuzz<T | null, U | null> {
    return new Fuzz((size, seed) => {
      const [random, shrink, nextSeed, filterMap] = this.generator(size, seed);
      return [random.nullable(n), shrink.nullable(), nextSeed, filterMap.nullable()];
    });
  }

  /**
   * Maps a value generated by the fuzzer to another fuzzer.
   * @param fn maps
   */
  bind<V, W>(fn: (u: U) => Fuzz<V, W>): Fuzz<V, W> {
    return new Fuzz((size, seed) => {
      const [random, , seed2, filterMap] = this.generator(size, seed);

      const nextRandom = random.filterMap<U>((t: T, REJECT) => {
        const result = filterMap.apply(t);

        if (isFilter(result)) {
          return REJECT;
        }

        return result;
      });

      const [value, seed3] = nextRandom.sample({ seed: seed2, maxSize: size });

      return fn(value).generator(size, seed3);
    });
  }

  /**
   * Forces the maximum size of the fuzzer instead of allowing it grow from zero.
   * @param maxSize Forced max size
   */
  resize(maxSize: number): Fuzz<T, U> {
    return new Fuzz((size, seed) => {
      const [random, shrink, nextSeed, filterMap] = this.generator(size, seed);
      return [random.resize(maxSize), shrink, nextSeed, filterMap];
    });
  }

  /**
   * Scales the size of the fuzzer.
   * @param fn Scaling function
   */
  scale(fn: (size: number) => number): Fuzz<T, U> {
    return new Fuzz((size, seed) => {
      const [random, shrink, nextSeed, filterMap] = this.generator(size, seed);
      return [random.resize(fn(size)), shrink, nextSeed, filterMap];
    });
  }

  /**
   * Internal function. Turns the fuzzer into a `Random<RoseTree>`.
   */
  toRandomRoseTree(): Random<RoseTree<T, U>> {
    return new Random((size, seed) => {
      const [random, shrink, seed2, filterMap] = this.generator(size, seed);

      const [pair, seed3] = random
        .filterMap<[T, U]>((t: T, REJECT) => {
          const next = filterMap.apply(t);

          if (isFilter(next)) {
            return REJECT;
          }

          return [t, next];
        })
        .sample({ seed: seed2, maxSize: size });

      const rose = new RoseTree(pair, shrink, filterMap);

      return [rose, seed3];
    });
  }
}

class Api {
  /**
   * Wraps a plain value in a fuzzer.
   * @param value Any value.
   */
  return<T>(value: T): Fuzz<T, T> {
    return Fuzz.from(rand.return(value), sh.noop());
  }

  /**
   * Creates an integer fuzzer.
   */
  integer(): Fuzz<number, number> {
    const random = biasedRandomNumber(true, true, true);
    return Fuzz.from(random, sh.integer());
  }

  /**
   * Creates positive integer fuzzer.
   */
  posInteger(): Fuzz<number, number> {
    const random = biasedRandomNumber(true, false, true);
    return Fuzz.from(random, sh.integer());
  }

  /**
   * Creates negative integer fuzzer.
   */
  negInteger(): Fuzz<number, number> {
    const random = biasedRandomNumber(false, true, true);
    return Fuzz.from(random, sh.integer());
  }

  /**
   * Creates a fuzzer that returns an integer with some bounds. Does not bias
   * the distribution of values.
   * @param minSize The minimum value
   * @param maxSize The maximum value
   */
  integerWithin(minSize: number, maxSize: number): Fuzz<number, number> {
    const pivot =
      maxSize - minSize > maxSize || maxSize - minSize < minSize
        ? 0
        : minSize < 0
        ? maxSize
        : minSize;

    return Fuzz.from(rand.integerWithin(minSize, maxSize), sh.atLeastInteger(pivot));
  }

  /**
   * Creates a float fuzzer.
   */
  float(): Fuzz<number, number> {
    const random = biasedRandomNumber(true, true, false);
    return Fuzz.from(random, sh.float());
  }

  /**
   * Creates a positive float fuzzer.
   */
  posFloat(): Fuzz<number, number> {
    const random = biasedRandomNumber(true, false, false);
    return Fuzz.from(random, sh.float());
  }

  /**
   * Creates a negative float fuzzer.
   */
  negFloat(): Fuzz<number, number> {
    const random = biasedRandomNumber(false, true, false);
    return Fuzz.from(random, sh.float());
  }

  /**
   * Creates a fuzzer that returns a float with some bounds. Does not bias
   * the distribution of values.
   * @param minSize The minimum value
   * @param maxSize The maximum value
   */
  floatWithin(minSize: number, maxSize: number): Fuzz<number, number> {
    const pivot =
      maxSize - minSize > maxSize || maxSize - minSize < minSize
        ? 0
        : minSize < 0
        ? maxSize
        : minSize;

    return Fuzz.from(rand.floatWithin(minSize, maxSize), sh.atLeastFloat(pivot));
  }

  /**
   * Creates a number fuzzer.
   */
  number(): Fuzz<number, number> {
    return this.frequency([[3, this.integer()], [1, this.float()]]);
  }

  /**
   * Creates a positive number fuzzer.
   */
  posNumber(): Fuzz<number, number> {
    return this.frequency([[3, this.posInteger()], [1, this.posFloat()]]);
  }

  /**
   * Creates a negative number fuzzer.
   */
  negNumber(): Fuzz<number, number> {
    return this.frequency([[3, this.negInteger()], [1, this.negFloat()]]);
  }

  /**
   * Creates a fuzzer that returns a number with some bounds. Does not bias
   * the distribution of values.
   * @param minSize The minimum value
   * @param maxSize The maximum value
   */
  numberWithin(minSize: number, maxSize: number): Fuzz<number, number> {
    return this.frequency([
      [3, this.integerWithin(Math.ceil(minSize), Math.floor(maxSize))],
      [1, this.floatWithin(minSize, maxSize)]
    ]);
  }

  /**
   * Creates a boolean fuzzer.
   */
  boolean(): Fuzz<boolean, boolean> {
    return Fuzz.from(rand.boolean(), sh.boolean());
  }

  /**
   * Creates a fuzzer that always returns true.
   */
  true(): Fuzz<boolean, boolean> {
    return this.return(true);
  }

  /**
   * Creates a fuzzer that always returns false.
   */
  false(): Fuzz<boolean, boolean> {
    return this.return(false);
  }

  /**
   * Creates a string fuzzer of ASCII characters.
   */
  string(): Fuzz<string, string> {
    return Fuzz.from(biasedRandomString(), sh.string());
  }

  /**
   * Creates a string fuzzer of just one ASCII character.
   */
  character(): Fuzz<string, string> {
    return Fuzz.from(rand.character(), sh.character());
  }

  /**
   * Creates a UUID fuzzer. Does not shrink the value.
   */
  uuid(): Fuzz<string, string> {
    return Fuzz.from(rand.uuid(), sh.noop());
  }

  /**
   * Lazily returns a fuzzer. Useful for recursive data structures.
   * @param fn Returns a fuzzer
   */
  lazy<T>(fn: () => Fuzz<any, T>): Fuzz<any, T> {
    /**
     * TODO: THIS is pretty lazy and probably slow. Fix?
     */
    return this.undefined().bind(fn);
  }

  /**
   * Always returns null.
   */
  null(): Fuzz<null, null> {
    return Fuzz.from(rand.return(null), sh.noop());
  }

  /**
   * Always returns undefined.
   */
  undefined(): Fuzz<undefined, undefined> {
    return Fuzz.from(rand.return(undefined), sh.noop());
  }

  /**
   * Garbage.
   */
  any(): Fuzz<any, any> {
    return this.oneOf<any, any>([
      this.integer(),
      this.float(),
      this.boolean(),
      this.string(),
      this.uuid(),
      this.array(this.lazy(this.any)),
      this.null(),
      this.undefined()
    ]);
  }

  /**
   * A higher-order fuzzer that creates an array of another fuzzer.
   * @param fuzz The members of a fuzzer.
   */
  array<T, U>(fuzz: Fuzz<T, U>): Fuzz<T[], U[]> {
    const biasedLength = biasedRandomNumber(true, false, true);

    return new Fuzz((size, seed) => {
      const [random, shrink, seed2, filterMap] = fuzz.generator(size, seed);
      const nextRandom = biasedLength.bind(maxLength => rand.array(random).resize(maxLength));
      const nextShrink = sh.array(shrink);

      return [nextRandom, nextShrink, seed2, filterMap.toArray()];
    });
  }

  /**
   * A higher-order fuzzer that returns a fuzzer based on frequency.
   * @param contexts An array of tuples where each tuple is a frequency of being selected and a fuzzer
   */
  frequency<T, U>(contexts: [number, Fuzz<T, U>][]): Fuzz<T, U> {
    const arr: Fuzz<T, U>[] = [];

    for (let [count, fuzzer] of contexts) {
      let i = -1;

      while (++i < count) {
        arr.push(fuzzer);
      }
    }

    return this.integerWithin(0, arr.length - 1).bind(n => arr[n]);
  }

  /**
   * A higher-order fuzzer that randomly selects one in given sample.
   * @param arr An array of fuzzers to be sampled from
   */
  oneOf<T, U>(arr: Fuzz<T, U>[]): Fuzz<T, U> {
    return this.integerWithin(0, arr.length - 1).bind(n => arr[n]);
  }

  /**
   * Does an Object spread over an array of fuzzer values. Same effect as
   * something like, `{ ...objA, ...objB }`
   * @param arr An array of fuzzers to spread over
   */
  spread(arr: []): Fuzz<{}, {}>;
  spread<A, B>(arr: [Fuzz<A, B>]): Fuzz<[A], B>;
  spread<A, B, C, D>(arr: [Fuzz<A, B>, Fuzz<C, D>]): Fuzz<[A, C], B & D>;
  spread<A, B, C, D, E, F>(arr: [Fuzz<A, B>, Fuzz<C, D>, Fuzz<E, F>]): Fuzz<[A, C, E], B & D & F>;
  spread<A, B, C, D, E, F, G, H>(
    arr: [Fuzz<A, B>, Fuzz<C, D>, Fuzz<E, F>, Fuzz<G, H>]
  ): Fuzz<[A, C, E, G], B & D & F & H>;
  spread<A, B, C, D, E, F, G, H, I, J>(
    arr: [Fuzz<A, B>, Fuzz<C, D>, Fuzz<E, F>, Fuzz<G, H>, Fuzz<I, J>]
  ): Fuzz<[A, C, E, G, I], B & D & F & H & J>;
  spread<A, B, C, D, E, F, G, H, I, J, K, L>(
    arr: [Fuzz<A, B>, Fuzz<C, D>, Fuzz<E, F>, Fuzz<G, H>, Fuzz<I, J>, Fuzz<K, L>]
  ): Fuzz<[A, C, E, G, I, K], B & D & F & H & J & L>;
  spread(arr: Fuzz<any, any>[]): Fuzz<any, any> {
    return this.tuple(arr).map(values =>
      values.reduce((acc, value) => Object.assign(acc, value), {})
    );
  }

  /**
   * Similar to array, but is a finite length of pre-defined fuzzers.
   * Shrinks the individual values, but never the length.
   * @param arr A list of fuzzers.
   */
  tuple<A, B>(arr: [Fuzz<A, B>]): Fuzz<[A], [B]>;
  tuple<A, B, C, D>(arr: [Fuzz<A, B>, Fuzz<C, D>]): Fuzz<[A, C], [B, D]>;
  tuple<A, B, C, D, E, F>(arr: [Fuzz<A, B>, Fuzz<C, D>, Fuzz<E, F>]): Fuzz<[A, C, E], [B, D, F]>;
  tuple<A, B, C, D, E, F, G, H>(
    arr: [Fuzz<A, B>, Fuzz<C, D>, Fuzz<E, F>, Fuzz<G, H>]
  ): Fuzz<[A, C, E, G], [B, D, F, H]>;
  tuple<A, B, C, D, E, F, G, H, I, J>(
    arr: [Fuzz<A, B>, Fuzz<C, D>, Fuzz<E, F>, Fuzz<G, H>, Fuzz<I, J>]
  ): Fuzz<[A, C, E, G, I], [B, D, F, H, J]>;
  tuple<A, B, C, D, E, F, G, H, I, J, K, L>(
    arr: [Fuzz<A, B>, Fuzz<C, D>, Fuzz<E, F>, Fuzz<G, H>, Fuzz<I, J>, Fuzz<K, L>]
  ): Fuzz<[A, C, E, G, I, K], [B, D, F, H, J, L]>;
  tuple<T, U>(arr: Fuzz<T, U>[]): Fuzz<T[], U[]>;
  tuple(arr: Fuzz<any, any>[]): Fuzz<any, any> {
    return new Fuzz((size, seed) => {
      const randoms: Random<any>[] = [];
      const shrinks: Shrink<any>[] = [];
      const filterMaps: FilterMap<any, any>[] = [];

      for (let fuzz of arr) {
        let random: Random<any>;
        let shrink: Shrink<any>;
        let filterMap: FilterMap<any, any>;

        [random, shrink, seed, filterMap] = fuzz.generator(size, seed);
        randoms.push(random);
        shrinks.push(shrink);
        filterMaps.push(filterMap);
      }

      const nextRandom = rand.tuple(randoms);
      const nextShrink = sh.tuple(shrinks);
      const nextFilterMap = FilterMap.tuple(filterMaps);

      return [nextRandom, nextShrink, seed, nextFilterMap];
    });
  }

  /**
   * Creates a fuzzer from an object where the values of the object are
   * either fuzzers or plain values. If they are plain values, they are
   * considered constant values and will not shrink.
   * @param obj Object of fuzzers
   */
  object<T>(obj: { [K in keyof T]: T[K] | Fuzz<any, T[K]> }): Fuzz<any, T> {
    const keys = Object.keys(obj) as (keyof T)[];
    const fuzzers = keys.reduce(
      (acc, key) => {
        const value: T[keyof T] | Fuzz<any, T[keyof T]> = obj[key];
        const fuzzer: Fuzz<any, T[keyof T]> = Fuzz.is(value) ? value : this.return(value);

        acc[key] = fuzzer;
        return acc;
      },
      {} as { [K in keyof T]: Fuzz<any, T[K]> }
    );

    return new Fuzz((size, seed) => {
      const randoms = {} as { [K in keyof T]: Random<T[K]> };
      const shrinks = {} as { [K in keyof T]: Shrink<T[K]> };
      const filterMaps = {} as { [K in keyof T]: FilterMap<any, T[K]> };

      for (let key of keys) {
        let random: Random<T[keyof T]>;
        let shrink: Shrink<T[keyof T]>;
        let filterMap: FilterMap<any, T[keyof T]>;

        [random, shrink, seed, filterMap] = fuzzers[key].generator(size, seed);
        randoms[key] = random;
        shrinks[key] = shrink;
        filterMaps[key] = filterMap;
      }

      const nextRandom = rand.object(randoms);
      const nextShrink = sh.object(shrinks);
      const nextFilterMap = FilterMap.object<T>(filterMaps);

      return [nextRandom, nextShrink, seed, nextFilterMap];
    });
  }
}

export default new Api();
