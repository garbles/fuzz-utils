import fuzz, { Fuzz } from "@fuzz-utils/fuzz";

abstract class ASTNode<T> {
  abstract toFuzz(): Fuzz<any, T>;
  abstract toString(prefix?: string): string;
  abstract toJSON(): { type: string };

  nullable(): NullableNode<T> {
    return new NullableNode(this);
  }

  maybe(): MaybeNode<T> {
    return new MaybeNode(this);
  }
}

class NullableNode<T> extends ASTNode<T | null> {
  constructor(private node: ASTNode<T>) {
    super();
  }

  toFuzz() {
    return this.node.toFuzz().nullable();
  }

  toString(prefix = "fuzz") {
    const node = this.node.toString(prefix);
    return `${node}.nullable()`;
  }

  toJSON() {
    return { type: "nullable", node: this.node.toJSON() };
  }
}

class MaybeNode<T> extends ASTNode<T | undefined> {
  constructor(private node: ASTNode<T>) {
    super();
  }

  toFuzz() {
    return this.node.toFuzz().maybe();
  }

  toString(prefix = "fuzz") {
    const node = this.node.toString(prefix);
    return `${node}.maybe()`;
  }

  toJSON() {
    return { type: "maybe", node: this.node.toJSON() };
  }
}

class ReferenceNode extends ASTNode<Error> {
  constructor(private name: string) {
    super();
  }

  toFuzz() {
    const err = new Error("Calling toFuzz on an object with a ReferenceNode is not allowed.");
    throw err;
    return fuzz.return(err);
  }

  toString(prefix = "fuzz") {
    return this.name;
  }

  toJSON() {
    return { type: "reference", name: this.name };
  }
}

class NumberNode extends ASTNode<number> {
  toFuzz() {
    return fuzz.number();
  }

  toString(prefix = "fuzz") {
    return `${prefix}.number()`;
  }

  toJSON() {
    return { type: "number" };
  }
}

class IntegerNode extends ASTNode<number> {
  toFuzz() {
    return fuzz.integer();
  }

  toString(prefix = "fuzz") {
    return `${prefix}.integer()`;
  }

  toJSON() {
    return { type: "integer" };
  }
}

class FloatNode extends ASTNode<number> {
  toFuzz() {
    return fuzz.float();
  }

  toString(prefix = "fuzz") {
    return `${prefix}.float()`;
  }

  toJSON() {
    return { type: "float" };
  }
}

class BooleanNode extends ASTNode<boolean> {
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

class StringNode extends ASTNode<string> {
  toFuzz() {
    return fuzz.string();
  }

  toString(prefix = "fuzz") {
    return `${prefix}.string()`;
  }

  toJSON() {
    return { type: "string" };
  }
}

class UuidNode extends ASTNode<string> {
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

class AnyNode extends ASTNode<any> {
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

class ArrayNode<T> extends ASTNode<T[]> {
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

class TupleNode<T> extends ASTNode<T[]> {
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

class OneOfNode<T> extends ASTNode<T> {
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

class SpreadNode<T> extends ASTNode<T> {
  constructor(private readonly elements: ASTNode<T>[]) {
    super();
  }

  toFuzz() {
    const elements = this.elements.map(el => el.toFuzz());
    return fuzz.spread(elements);
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

class ReturnNode<T> extends ASTNode<T> {
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

class ObjectNode<T> extends ASTNode<T> {
  constructor(private readonly elements: { [K in keyof T]: [K, ASTNode<T[K]>] }[keyof T][]) {
    super();
  }

  toFuzz() {
    const result = this.elements.reduce(
      (acc, element) => {
        const [key, node] = element;
        acc[key] = node.toFuzz();
        return acc;
      },
      {} as { [K in keyof T]: Fuzz<any, T[K]> }
    );

    return fuzz.object(result);
  }

  toString(prefix = "fuzz") {
    const result = this.elements.reduce(
      (acc, element) => {
        const [key, node] = element;
        return acc.concat(`"${key}": ${node.toString(prefix)}`);
      },
      [] as string[]
    );

    return `${prefix}.object({ ${result.join(", ")} })`;
  }

  toJSON() {
    const elements = this.elements.reduce(
      (acc, element) => {
        const [key, node] = element;
        const next: [any, any] = [key, node.toJSON()];
        return [...acc, next];
      },
      [] as [any, any][]
    );

    return { type: "object", elements };
  }
}

class Api {
  return<T>(element: T) {
    return new ReturnNode(element);
  }

  number() {
    return new NumberNode();
  }

  integer() {
    return new IntegerNode();
  }

  float() {
    return new FloatNode();
  }

  boolean() {
    return new BooleanNode();
  }

  string() {
    return new StringNode();
  }

  uuid() {
    return new UuidNode();
  }

  any() {
    return new AnyNode();
  }

  array<T>(elements: ASTNode<T>) {
    return new ArrayNode(elements);
  }

  tuple<T>(elements: ASTNode<T>[]) {
    return new TupleNode(elements);
  }

  oneOf<T>(elements: ASTNode<T>[]) {
    return new OneOfNode(elements);
  }

  spread<T>(elements: ASTNode<T>[]) {
    return new SpreadNode(elements);
  }

  object<T>(elements: { [K in keyof T]: [K, ASTNode<T[K]>] }[keyof T][]) {
    return new ObjectNode(elements);
  }

  nullable<T>(node: ASTNode<T>) {
    return new NullableNode(node);
  }

  maybe<T>(node: ASTNode<T>) {
    return new MaybeNode(node);
  }

  reference(name: string) {
    return new ReferenceNode(name);
  }
}

export default new Api();

export const fromJSON = (json: any): ASTNode<any> => {
  switch (json.type) {
    case "number":
      return new NumberNode();
    case "integer":
      return new IntegerNode();
    case "float":
      return new FloatNode();
    case "boolean":
      return new BooleanNode();
    case "string":
      return new StringNode();
    case "uuid":
      return new UuidNode();
    case "any":
      return new AnyNode();
    case "return":
      return new ReturnNode(json.element);
    case "array": {
      const elements = fromJSON(json.elements);
      return new ArrayNode(elements);
    }
    case "tuple": {
      const elements = json.elements.map(fromJSON);
      return new TupleNode(elements);
    }
    case "oneOf": {
      const elements = json.elements.map(fromJSON);
      return new OneOfNode(elements);
    }
    case "spread": {
      const elements = json.elements.map(fromJSON);
      return new SpreadNode(elements);
    }
    case "object": {
      const elements = json.elements.reduce(
        (acc: any, element: any) => {
          const [key, node] = element;
          return [...acc, [key, fromJSON(node)]];
        },
        [] as [any, any][]
      );

      return new ObjectNode(elements);
    }
    case "nullable": {
      const node = fromJSON(json.node);
      return new NullableNode(node);
    }
    case "maybe": {
      const node = fromJSON(json.node);
      return new MaybeNode(node);
    }
    case "reference": {
      return new ReferenceNode(json.name);
    }
    default:
      return new ReturnNode(undefined);
  }
};
