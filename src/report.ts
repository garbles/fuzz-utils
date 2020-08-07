type FailureCase<T> = {
  args: T;
  error: Error;
};

export class Report<T> {
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
