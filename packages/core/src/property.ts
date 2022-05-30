import { Fuzz, ShrinkingValue } from "./fuzz";
import { Random, RandomToGeneratorOptions } from "./random";

type TestRun<T extends any[], Z> = {
  args: T;
  exec(): Z;
};

export class Property<T extends any[], Z> {
  toGenerator: (options?: Partial<RandomToGeneratorOptions>) => Generator<ShrinkingValue<TestRun<T, Z>>>;

  constructor(readonly fuzzer: Fuzz<any, T>, readonly cb: (...args: T) => Z) {
    const toRun = (args: T): TestRun<T, Z> => {
      return {
        args,
        exec: () => this.cb(...args),
      };
    };

    const random = fuzzer.map(toRun).toRandomShrinkingValue();

    this.toGenerator = (options = {}) => random.toGenerator(options);
  }
}

export const property = <T extends any[], Z>(fuzzer: Fuzz<any, T>, cb: (...args: T) => Z) => {
  return new Property(fuzzer, cb);
};
