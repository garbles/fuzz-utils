import { Fuzz, RoseTree } from "./fuzz";
import { RandomOptions, Random } from "./random";

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

type TestRun<T> = {
  args: T;
  run(): any;
};

export class Runner<T, U> {
  constructor(private fuzzer: Fuzz<T, U>, private options: Partial<RandomOptions> = {}) {}

  async exec(cb: (u: U) => any): Promise<Report<U>> {
    const toTestRun = (args: U): TestRun<U> => {
      return {
        args,
        run() {
          return cb.call(null, args);
        }
      };
    };

    const iter = this.fuzzer
      .map(toTestRun)
      .toRandomRoseTree()
      .toIterator(this.options);

    const report: Report<U> = {
      success: [],
      failure: [],
      completed: false
    };

    for await (let event of this.toEventIterator(iter, 0)) {
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

  private async *toEventIterator(
    iter: Generator<RoseTree<T, TestRun<U>>, any, unknown>,
    depth = 0
  ): AsyncGenerator<RunnerEvent<U>, any, unknown> {
    for (let rose of iter) {
      const test = rose.value();
      let error: Error | null = null;

      try {
        await test.run();
      } catch (next) {
        error = next;
      }

      if (error === null) {
        const event: SuccessEvent<U> = {
          type: "success",
          data: {
            args: test.args,
            depth
          }
        };

        yield event;
      } else {
        const event: FailureEvent<U> = {
          type: "failure",
          data: {
            args: test.args,
            depth,
            error
          }
        };

        yield event;

        const next = rose.children();
        yield* this.toEventIterator(next, depth + 1);
        return;
      }
    }

    const complete: CompleteEvent = {
      type: "complete"
    };

    yield complete;
  }
}
