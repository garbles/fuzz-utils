import fuzz, { Fuzz, RoseTree } from "./fuzz";
import { ToGeneratorOptions } from "./random";
import { Report } from "./report";

type CompleteEvent = {
  type: "complete";
};

type FailureData<T> = {
  args: T;
  error: Error;
  depth: number;
};

type FailureEvent<T> = {
  type: "failure";
  data: FailureData<T>;
};

type RunnerEvent<T> = FailureEvent<T> | CompleteEvent;

type Run<T> = {
  args: T;
  exec(): any;
};

export class Runner<T extends any[]> {
  static from<A>(fuzzers: [Fuzz<any, A>]): Runner<[A]>;
  static from<A, B>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>]): Runner<[A, B]>;
  static from<A, B, C>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>]): Runner<[A, B, C]>;
  static from<A, B, C, D>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>]): Runner<[A, B, C, D]>;
  static from<A, B, C, D, E>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>]): Runner<[A, B, C, D, E]>; // prettier-ignore
  static from<A, B, C, D, E, F>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>, Fuzz<any, F>]): Runner<[A, B, C, D, E, F]>; // prettier-ignore
  static from<A, B, C, D, E, F, G>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>, Fuzz<any, F>, Fuzz<any, G>]): Runner<[A, B, C, D, E, F, G]>; // prettier-ignore
  static from<A, B, C, D, E, F, G, H>(fuzzers: [Fuzz<any, A>, Fuzz<any, B>, Fuzz<any, C>, Fuzz<any, D>, Fuzz<any, E>, Fuzz<any, F>, Fuzz<any, G>, Fuzz<any, H>]): Runner<[A, B, C, D, E, F, G, H]>; // prettier-ignore
  static from(fuzzers: Fuzz<any, any>[]): Runner<any> {
    const fuzzer = fuzz.tuple(fuzzers);
    return new Runner(fuzzer);
  }

  constructor(private fuzzer: Fuzz<any, T>) {}

  async run(cb: (...args: T) => any, options: Partial<ToGeneratorOptions> = {}): Promise<Report<T>> {
    const toRun = (args: T): Run<T> => {
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

  private async *toEventIterator(iter: Generator<RoseTree<any, Run<T>>>, depth = 0): AsyncGenerator<RunnerEvent<T>> {
    for (let rose of iter) {
      const run = rose.value();

      try {
        await run.exec();
      } catch (error) {
        const failure: FailureEvent<T> = {
          type: "failure",
          data: {
            args: run.args,
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
