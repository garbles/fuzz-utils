import fuzz, { Fuzz } from "./fuzz";

class Property<T extends any[]> {
  static from<A>(fuzzers: [Fuzz<any, A>], cb: (a: A) => void): Property<[A]>;
  static from<A, B>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>], cb: (a: A, b: B) => void): Property<[A, B]>; // prettier-ignore
  static from<A, B, C>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>], cb: (a: A, b: B, c: C) => void): Property<[A, B, C]>; // prettier-ignore
  static from<A, B, C, D>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>], cb: (a: A, b: B, c: C, d: D) => void): Property<[A, B, C, D]>; // prettier-ignore
  static from<A, B, C, D, E>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>], cb: (a: A, b: B, c: C, d: D, e: E) => void): Property<[A, B, C, D, E]>; // prettier-ignore
  static from<A, B, C, D, E, F>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>, Fuzz<any, F>], cb: (a: A, b: B, c: C, d: D, e: E, f: F) => void): Property<[A, B, C, D, E, F]>; // prettier-ignore
  static from<A, B, C, D, E, F, G>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>, Fuzz<any, F>, Fuzz<any, G>], cb: (a: A, b: B, c: C, d: D, e: E, f: F, g: G) => void): Property<[A, B, C, D, E, F, G]>; // prettier-ignore
  static from<A, B, C, D, E, F, G, H>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>, Fuzz<any, F>, Fuzz<any, G>, Fuzz<any, H>], cb: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H) => void): Property<[A, B, C, D, E, F, G, H]>; // prettier-ignore
  static from(fuzzers: Fuzz<any, any>[], cb: (...args: unknown[]) => void): Property<any> {
    const fuzzer = fuzz.tuple(fuzzers);
    return new Property(fuzzer, cb);
  }

  constructor(private fuzzer: Fuzz<any, T>, private callback: (...args: T) => void) {}
}
