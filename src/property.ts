import { Fuzz, ShrinkingRoseTree } from "./fuzz";
import { ToGeneratorOptions } from "./random";

type TestRun<T extends any[], Z> = {
  args: T;
  exec(): Z;
};

export class Property<T extends any[], Z> {
  constructor(private fuzzer: Fuzz<any, T>, private cb: (...args: T) => Z) {}

  toGenerator(options: Partial<ToGeneratorOptions> = {}): Generator<ShrinkingRoseTree<any, TestRun<T, Z>>, any, unknown> {
    const toRun = (args: T): TestRun<T, Z> => {
      return {
        args,
        exec: () => this.cb(...args),
      };
    };

    return this.fuzzer.map(toRun).toRandomRoseTree().toGenerator(options);
  }
}
