import { fuzz, Fuzz, ShrinkingValue } from "./fuzz";
import { Property } from "./property";
import { RandomToGeneratorOptions } from "./random";

export type FailureCase<T> = {
  args: T;
  error: Error;
};

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

type TestRun<T, Z> = {
  args: T;
  exec(): Z;
};

class Report<T> {
  public failures: FailureCase<T>[] = [];

  addFailure(data: FailureCase<T>) {
    this.failures.unshift(data);
  }

  get success() {
    return this.failures.length === 0;
  }

  get smallestFailure(): FailureCase<T> | void {
    return this.failures[0];
  }
}

async function* toEventIterator<T extends any[], Z>(
  iter: Generator<ShrinkingValue<TestRun<T, Z>>>,
  depth = 0
): AsyncGenerator<RunnerEvent<T>> {
  for (let rose of iter) {
    const testRun = rose.value;

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

      const next = rose.shrink();
      yield* toEventIterator(next, depth + 1);
      return;
    }
  }

  const complete: CompleteEvent = {
    type: "complete",
  };

  yield complete;
}

export class TestRunner<T extends any[], Z> {
  static from<A, Z>(fuzzers: [Fuzz<any, A>], cb: (a: A) => Z): TestRunner<[A], Z>;
  static from<A, B, Z>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>], cb: (a: A, b: B) => Z): TestRunner<[A, B], Z>;
  static from<A, B, C, Z>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>], cb: (a: A, b: B, c: C) => Z): TestRunner<[A, B, C], Z>; // prettier-ignore
  static from<A, B, C, D, Z>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>], cb: (a: A, b: B, c: C, d: D) => Z): TestRunner<[A, B, C, D], Z>; // prettier-ignore
  static from<A, B, C, D, E, Z>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>], cb: (a: A, b: B, c: C, d: D, e: E) => Z): TestRunner<[A, B, C, D, E], Z>; // prettier-ignore
  static from<A, B, C, D, E, F, Z>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>, Fuzz<any, F>], cb: (a: A, b: B, c: C, d: D, e: E, f: F) => Z): TestRunner<[A, B, C, D, E, F], Z>; // prettier-ignore
  static from<A, B, C, D, E, F, G, Z>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>, Fuzz<any, F>, Fuzz<any, G>], cb: (a: A, b: B, c: C, d: D, e: E, f: F, g: G) => Z): TestRunner<[A, B, C, D, E, F, G], Z>; // prettier-ignore
  static from<A, B, C, D, E, F, G, H, Z>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>, Fuzz<any, F>, Fuzz<any, G>, Fuzz<any, H>], cb: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H) => Z): TestRunner<[A, B, C, D, E, F, G, H], Z>; // prettier-ignore
  static from(fuzzers: Fuzz<any, any>[], cb: (...args: any[]) => any): TestRunner<any, any> {
    const fuzzer = fuzz.tuple(fuzzers);
    const property = new Property(fuzzer, cb);
    return new TestRunner(property);
  }

  constructor(private property: Property<T, Z>) {}

  async run(options: Partial<RandomToGeneratorOptions> = {}): Promise<Report<T>> {
    const iter = this.property.toGenerator(options);

    const report = new Report<T>();

    for await (let event of toEventIterator(iter)) {
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
}

export const runner = <T extends any[], Z>(property: Property<T, Z>) => new TestRunner(property);
