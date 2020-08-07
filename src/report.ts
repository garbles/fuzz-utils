type FailureCase<T> = {
  args: T;
  error: Error;
};

export class Report<T> {
  private list: FailureCase<T>[] = [];

  addFailure(data: FailureCase<T>) {
    this.list.unshift(data);
  }

  get success() {
    return this.list.length === 0;
  }

  get smallestFailure(): FailureCase<T> | void {
    return this.list[0];
  }
}
