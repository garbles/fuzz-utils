import fuzz, { Fuzz } from "@fuzz-utils/fuzz";

abstract class ASTNode<T> {
  abstract toFuzz(): Fuzz<any, T>;
  abstract toString(prefix: string): string;
  abstract toJSON(): { type: string };
}

class NumberASTNode extends ASTNode<number> {
  // TODO: Actually use these
  constructor(private min?: number, private max?: number) {
    super();
  }

  toFuzz() {
    return fuzz.number();
  }

  toString(prefix = "fuzz") {
    return `${prefix}.number()`;
  }

  toJSON() {
    return { type: "number", min: this.min, max: this.max };
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

  toJSON() {
    return { type: "integer", min: this.min, max: this.max };
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

  toJSON() {
    return { type: "float", min: this.min, max: this.max };
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

  toJSON() {
    return { type: "boolean" };
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

  toJSON() {
    return { type: "string", max: this.max };
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

  toJSON() {
    return { type: "uuid" };
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

  toJSON() {
    return { type: "any" };
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

  toJSON() {
    const elements = this.elements.toJSON();
    return { type: "array", elements };
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

  toJSON() {
    const elements = this.elements.map(el => el.toJSON());
    return { type: "tuple", elements };
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

  toJSON() {
    const elements = this.elements.map(el => el.toJSON());
    return { type: "oneOf", elements };
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

  toJSON() {
    const elements = this.elements.map(el => el.toJSON());
    return { type: "spread", elements };
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

  toJSON() {
    const element = JSON.parse(JSON.stringify(this.element));
    return { type: "return", element };
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

  toJSON() {
    const keys = Object.keys(this.elements) as (keyof T)[];
    const elements = keys.reduce(
      (acc, key) => {
        acc[key] = this.elements[key].toJSON();
        return acc;
      },
      {} as { [K in keyof T]: { type: string } }
    );

    return { type: "object", elements };
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

export const fromJSON = (json: any): ASTNode<any> => {
  switch (json.type) {
    case "number":
      return new NumberASTNode(json.min, json.max);
    case "integer":
      return new IntegerASTNode(json.min, json.max);
    case "float":
      return new FloatASTNode(json.min, json.max);
    case "boolean":
      return new BooleanASTNode();
    case "string":
      return new StringASTNode(json.max);
    case "uuid":
      return new UuidASTNode();
    case "any":
      return new AnyASTNode();
    case "array": {
      const elements = fromJSON(json.elements);
      return new ArrayASTNode(elements);
    }
    case "tuple": {
      const elements = json.elements.map(fromJSON);
      return new TupleASTNode(elements);
    }
    case "oneOf": {
      const elements = json.elements.map(fromJSON);
      return new OneOfASTNode(elements);
    }
    case "spread": {
      const elements = json.elements.map(fromJSON);
      return new SpreadASTNode(elements);
    }
    case "return":
      return new ReturnASTNode(json.element);
    case "object":
      const keys = Object.keys(json.elements);
      const elements = keys.reduce(
        (acc, key) => {
          acc[key] = fromJSON(json.elements[key]);
          return acc;
        },
        {} as any
      );
      return new ObjectASTNode(elements);
    default:
      return new ReturnASTNode(undefined);
  }
};
