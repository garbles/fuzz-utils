import fuzz, { Fuzz, RoseTree } from "./fuzz";
import { ToGeneratorOptions } from "./random";

type CompleteEvent = {
  type: "complete";
};

type SuccessData<T> = {
  args: T;
  depth: number;
};

type SuccessEvent<T> = {
  type: "success";
  data: SuccessData<T>;
};

type FailData<T> = {
  args: T;
  error: Error;
  depth: number;
};

type FailureEvent<T> = {
  type: "failure";
  data: FailData<T>;
};

type RunnerEvent<T> = SuccessEvent<T> | FailureEvent<T> | CompleteEvent;

type Report<T> = {
  success: SuccessEvent<T>[];
  failure: FailureEvent<T>[];
  completed: boolean;
};

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

    const report: Report<T> = {
      success: [],
      failure: [],
      completed: false,
    };

    for await (let event of this.toEventIterator(iter)) {
      switch (event.type) {
        case "success":
          report.success.push(event);
          continue;
        case "failure":
          report.failure.push(event);
          continue;
        case "complete":
          report.completed = true;
          return report;
      }
    }

    return report;
  }

  private async *toEventIterator(iter: Generator<RoseTree<any, Run<T>>>, depth = 0): AsyncGenerator<RunnerEvent<T>> {
    for (let rose of iter) {
      const run = rose.value();
      let error: Error | null = null;

      try {
        await run.exec();
      } catch (next) {
        error = next;
      }

      if (error === null) {
        const event: SuccessEvent<T> = {
          type: "success",
          data: {
            args: run.args,
            depth,
          },
        };

        yield event;
      } else {
        const event: FailureEvent<T> = {
          type: "failure",
          data: {
            args: run.args,
            depth,
            error,
          },
        };

        yield event;

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
