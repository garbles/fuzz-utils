import { Fuzz, RoseTree } from "./fuzz";
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

export type Report<T> = {
  success: SuccessEvent<T>[];
  failure: FailureEvent<T>[];
  completed: boolean;
};

type Run<T> = {
  args: T;
  exec(): any;
};

export class Runner<T, U> {
  constructor(private fuzzer: Fuzz<T, U>) {}

  async run(cb: (u: U) => any, options: Partial<ToGeneratorOptions> = {}): Promise<Report<U>> {
    const toRun = (args: U): Run<U> => {
      return {
        args,
        exec() {
          return cb.call(null, args);
        },
      };
    };

    const iter = this.fuzzer.map(toRun).toRandomRoseTree().toGenerator(options);

    const report: Report<U> = {
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

  private async *toEventIterator(
    iter: Generator<RoseTree<T, Run<U>>, any, unknown>,
    depth = 0
  ): AsyncGenerator<RunnerEvent<U>, any, unknown> {
    for (let rose of iter) {
      const run = rose.value();
      let error: Error | null = null;

      try {
        await run.exec();
      } catch (next) {
        error = next;
      }

      if (error === null) {
        const event: SuccessEvent<U> = {
          type: "success",
          data: {
            args: run.args,
            depth,
          },
        };

        yield event;
      } else {
        const event: FailureEvent<U> = {
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
