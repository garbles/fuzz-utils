type FailureCase<T> = {
  args: T;
  error: Error;
};

type LinkedList<T> = [T, LinkedList<T>] | [];

export class Report<T> {
  private list: LinkedList<FailureCase<T>> = [];

  addFailure(data: FailureCase<T>) {
    this.list = [data, this.list];
  }

  get success() {
    return this.list.length === 0;
  }

  get smallestFailure(): FailureCase<T> | void {
    return this.list[0];
  }
}
