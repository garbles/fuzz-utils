import fuzz, { Fuzz, RoseTree } from "./fuzz";
import { ToGeneratorOptions } from "./random";
import { Report } from "./report";

type CompleteEvent = {
  type: "complete";
};

type FailureData<T> = {
  args: T;
  error: any;
  depth: number;
};

type FailureEvent<T> = {
  type: "failure";
  data: FailureData<T>;
};

type RunnerEvent<T> = FailureEvent<T> | CompleteEvent;

type TestRun<T> = {
  args: T;
  exec(): void;
};

export class Runner<T extends any[]> {
  static from<A>(fuzzers: [Fuzz<any, A>], cb: (a: A) => void): Runner<[A]>;
  static from<A, B>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>], cb: (a: A, b: B) => void): Runner<[A, B]>;
  static from<A, B, C>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>], cb: (a: A, b: B, c: C) => void): Runner<[A, B, C]>; // prettier-ignore
  static from<A, B, C, D>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>], cb: (a: A, b: B, c: C, d: D) => void): Runner<[A, B, C, D]>; // prettier-ignore
  static from<A, B, C, D, E>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>], cb: (a: A, b: B, c: C, d: D, e: E) => void): Runner<[A, B, C, D, E]>; // prettier-ignore
  static from<A, B, C, D, E, F>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>, Fuzz<any, F>], cb: (a: A, b: B, c: C, d: D, e: E, f: F) => void): Runner<[A, B, C, D, E, F]>; // prettier-ignore
  static from<A, B, C, D, E, F, G>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>, Fuzz<any, F>, Fuzz<any, G>], cb: (a: A, b: B, c: C, d: D, e: E, f: F, g: G) => void): Runner<[A, B, C, D, E, F, G]>; // prettier-ignore
  static from<A, B, C, D, E, F, G, H>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>, Fuzz<any, F>, Fuzz<any, G>, Fuzz<any, H>], cb: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H) => void): Runner<[A, B, C, D, E, F, G, H]>; // prettier-ignore
  static from(fuzzers: Fuzz<any, any>[], cb: (...args: any[]) => void): Runner<any> {
    const fuzzer = fuzz.tuple(fuzzers);
    return new Runner(fuzzer, cb);
  }

  constructor(private fuzzer: Fuzz<any, T>, private cb: (...args: any[]) => void) {}

  async run(options: Partial<ToGeneratorOptions> = {}): Promise<Report<T>> {
    const cb = this.cb.bind(null);

    const toRun = (args: T): TestRun<T> => {
      return {
        args,
        exec() {
          return cb.apply(null, args);
        },
      };
    };

    const iter = this.fuzzer.map(toRun).toRandomRoseTree().toGenerator(options);

    const report = new Report<T>();

    for await (let event of this.toEventIterator(iter)) {
      switch (event.type) {
        case "failure":
          report.addFailure(event.data);
          continue;
        case "complete":
          break;
      }
    }

    return report;
  }

  private async *toEventIterator(iter: Generator<RoseTree<any, TestRun<T>>>, depth = 0): AsyncGenerator<RunnerEvent<T>> {
    for (let rose of iter) {
      const testRun = rose.value();

      try {
        await testRun.exec();
      } catch (error) {
        const failure: FailureEvent<T> = {
          type: "failure",
          data: {
            args: testRun.args,
            depth,
            error,
          },
        };

        yield failure;

        const next = rose.children();
        yield* this.toEventIterator(next, depth + 1);
        return;
      }
    }

    const complete: CompleteEvent = {
      type: "complete",
    };

    yield complete;
  }
}
