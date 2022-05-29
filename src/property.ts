import { Fuzz, ShrinkingValue } from "./fuzz";
import { RandomToGeneratorOptions } from "./random";

type TestRun<T extends any[], Z> = {
  args: T;
  exec(): Z;
};

export class Property<T extends any[], Z> {
  constructor(private readonly fuzzer: Fuzz<any, T>, private readonly cb: (...args: T) => Z) {}

  toGenerator(options: Partial<RandomToGeneratorOptions> = {}): Generator<ShrinkingValue<TestRun<T, Z>>> {
    const toRun = (args: T): TestRun<T, Z> => {
      return {
        args,
        exec: () => this.cb(...args),
      };
    };

    return this.fuzzer.map(toRun).toRandomShrinkingValue().toGenerator(options);
  }
}

export const property = <T extends any[], Z>(fuzzer: Fuzz<any, T>, cb: (...args: T) => Z) => {
  return new Property(fuzzer, cb);
};
