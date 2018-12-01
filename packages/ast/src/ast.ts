import fuzz, { Fuzz } from "@fuzz-utils/fuzz";

abstract class ASTNode<T> {
  abstract toFuzz(): Fuzz<any, T>;
  abstract toString(prefix: string): string;
}

class NumberASTNode extends ASTNode<number> {
  constructor(private min?: number, private max?: number) {
    super();
  }

  toFuzz() {
    return fuzz.number();
  }

  toString(prefix = "fuzz") {
    return `${prefix}.number()`;
  }
}

class IntegerASTNode extends ASTNode<number> {
  constructor(private min?: number, private max?: number) {
    super();
  }

  toFuzz() {
    return fuzz.integer();
  }

  toString(prefix = "fuzz") {
    return `${prefix}.integer()`;
  }
}

class FloatASTNode extends ASTNode<number> {
  constructor(private min?: number, private max?: number) {
    super();
  }

  toFuzz() {
    return fuzz.float();
  }

  toString(prefix = "fuzz") {
    return `${prefix}.float()`;
  }
}

class BooleanASTNode extends ASTNode<boolean> {
  constructor() {
    super();
  }

  toFuzz() {
    return fuzz.boolean();
  }

  toString(prefix = "fuzz") {
    return `${prefix}.boolean()`;
  }
}

class StringASTNode extends ASTNode<string> {
  constructor(private max?: number) {
    super();
  }

  toFuzz() {
    return fuzz.string();
  }

  toString(prefix = "fuzz") {
    return `${prefix}.string()`;
  }
}

class UuidASTNode extends ASTNode<string> {
  constructor() {
    super();
  }

  toFuzz() {
    return fuzz.uuid();
  }

  toString(prefix = "fuzz") {
    return `${prefix}.uuid()`;
  }
}

class AnyASTNode extends ASTNode<any> {
  constructor() {
    super();
  }

  toFuzz() {
    return fuzz.any();
  }

  toString(prefix = "fuzz") {
    return `${prefix}.any()`;
  }
}

class ArrayASTNode<T> extends ASTNode<T[]> {
  constructor(private readonly elements: ASTNode<T>) {
    super();
  }

  toFuzz() {
    const elements = this.elements.toFuzz();
    return fuzz.array(elements);
  }

  toString(prefix = "fuzz") {
    const elements = this.elements.toString(prefix);
    return `${prefix}.array(${elements})`;
  }
}

class TupleASTNode<T> extends ASTNode<T[]> {
  constructor(private readonly elements: ASTNode<T>[]) {
    super();
  }

  toFuzz() {
    const elements = this.elements.map(el => el.toFuzz());
    return fuzz.tuple(elements);
  }

  toString(prefix = "fuzz") {
    const elements = this.elements.map(el => el.toString(prefix));
    return `${prefix}.tuple([${elements.join(", ")}])`;
  }
}

class OneOfASTNode<T> extends ASTNode<T> {
  constructor(private readonly elements: ASTNode<T>[]) {
    super();
  }

  toFuzz() {
    const elements = this.elements.map(el => el.toFuzz());
    return fuzz.oneOf(elements);
  }

  toString(prefix = "fuzz") {
    const elements = this.elements.map(el => el.toString(prefix));
    return `${prefix}.oneOf([${elements.join(", ")}])`;
  }
}

class SpreadASTNode<T> extends ASTNode<T> {
  constructor(private readonly elements: ASTNode<T>[]) {
    super();
  }

  // TODO: fix in random. Spread should be able to take 1 or 0 elements
  toFuzz() {
    const elements = this.elements.map(el => el.toFuzz());
    return fuzz.spread(elements as any) as any;
  }

  toString(prefix = "fuzz") {
    const elements = this.elements.map(el => el.toString(prefix));
    return `${prefix}.spread([${elements.join(", ")}])`;
  }
}

class ReturnASTNode<T> extends ASTNode<T> {
  constructor(private readonly element: T) {
    super();
  }

  toFuzz() {
    return fuzz.return(this.element);
  }

  toString(prefix = "fuzz") {
    return `${prefix}.return(${JSON.stringify(this.element)})`;
  }
}

class ObjectASTNode<T> extends ASTNode<T> {
  constructor(private readonly elements: { [K in keyof T]: ASTNode<T[K]> }) {
    super();
  }

  toFuzz() {
    const keys = Object.keys(this.elements) as (keyof T)[];
    const result = keys.reduce(
      (acc, key) => {
        acc[key] = this.elements[key].toFuzz();
        return acc;
      },
      {} as { [K in keyof T]: Fuzz<any, T[K]> }
    );

    return fuzz.object(result);
  }

  toString(prefix = "fuzz") {
    const keys = Object.keys(this.elements) as (keyof T)[];

    const result = keys.reduce(
      (acc, key) => {
        return acc.concat(`"${key}": ${this.elements[key].toString(prefix)}`);
      },
      [] as string[]
    );

    return `${prefix}.object({ ${result.join(", ")} })`;
  }
}

class Api {
  return<T>(element: T) {
    return new ReturnASTNode(element);
  }

  number(min?: number, max?: number) {
    return new NumberASTNode(min, max);
  }

  integer(min?: number, max?: number) {
    return new IntegerASTNode(min, max);
  }

  float(min?: number, max?: number) {
    return new FloatASTNode(min, max);
  }

  boolean() {
    return new BooleanASTNode();
  }

  string(max?: number) {
    return new StringASTNode(max);
  }

  uuid() {
    return new UuidASTNode();
  }

  any() {
    return new AnyASTNode();
  }

  array<T>(elements: ASTNode<T>) {
    return new ArrayASTNode(elements);
  }

  tuple<T>(elements: ASTNode<T>[]) {
    return new TupleASTNode(elements);
  }

  oneOf<T>(elements: ASTNode<T>[]) {
    return new OneOfASTNode(elements);
  }

  spread<T>(elements: ASTNode<T>[]) {
    return new SpreadASTNode(elements);
  }

  object<T>(elements: { [K in keyof T]: ASTNode<T[K]> }) {
    return new ObjectASTNode(elements);
  }
}

export default new Api();
