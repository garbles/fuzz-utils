import fuzz, { Fuzz } from "@fuzz-utils/fuzz";

export type Context = {
  withTypes: boolean;
  prefix: string;
  fuzzReturnType: string;
  fuzzerType: string;
};

export const runtime = (context: Context): string => {
  const { prefix, fuzzReturnType, fuzzerType } = context;
  const defaultImportName = "__HIDEOUS_FUZZ_DEFAULT_IMPORT__";
  const fuzzTypeImport = fuzzerType === "Fuzz" ? "Fuzz" : `Fuzz as ${fuzzerType}`;

  return [
    `import ${defaultImportName}, { ${fuzzTypeImport} } from '@fuzz-utils/fuzz';`,
    `type ${fuzzReturnType}<T> = T extends ${fuzzerType}<any, infer U> ? U : never;`,
    `const ${prefix} = ${defaultImportName};`
  ].join("\n");
};

export abstract class ASTNode<T> {
  abstract toFuzz(): Fuzz<any, T>;
  abstract toString(ctx: Context): string;
  abstract toJSON(): { type: string };
  abstract toType(ctx: Context): string;

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

  toString(context: Context) {
    const node = this.node.toString(context);
    return `${node}.nullable()`;
  }

  toJSON() {
    return { type: "nullable", node: this.node.toJSON() };
  }

  toType(context: Context) {
    const type = this.node.toType(context);
    return `(${type}) | null`;
  }
}

class MaybeNode<T> extends ASTNode<T | undefined> {
  constructor(private node: ASTNode<T>) {
    super();
  }

  toFuzz() {
    return this.node.toFuzz().maybe();
  }

  toString(context: Context) {
    const node = this.node.toString(context);
    return `${node}.maybe()`;
  }

  toJSON() {
    return { type: "maybe", node: this.node.toJSON() };
  }

  toType(context: Context) {
    const type = this.node.toType(context);
    return `(${type}) | undefined`;
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

  toString(context: Context) {
    return `${context.prefix}.lazy(() => ${this.name})`;
  }

  toJSON() {
    return { type: "reference", name: this.name };
  }

  toType(context: Context) {
    return `${context.fuzzReturnType}<${this.name}>`;
  }
}

class NumberNode extends ASTNode<number> {
  toFuzz() {
    return fuzz.number();
  }

  toString(context: Context) {
    return `${context.prefix}.number()`;
  }

  toJSON() {
    return { type: "number" };
  }

  toType(context: Context) {
    return "number";
  }
}

class IntegerNode extends ASTNode<number> {
  toFuzz() {
    return fuzz.integer();
  }

  toString(context: Context) {
    return `${context.prefix}.integer()`;
  }

  toJSON() {
    return { type: "integer" };
  }

  toType(context: Context) {
    return "number";
  }
}

class FloatNode extends ASTNode<number> {
  toFuzz() {
    return fuzz.float();
  }

  toString(context: Context) {
    return `${context.prefix}.float()`;
  }

  toJSON() {
    return { type: "float" };
  }

  toType(context: Context) {
    return "number";
  }
}

class BooleanNode extends ASTNode<boolean> {
  toFuzz() {
    return fuzz.boolean();
  }

  toString(context: Context) {
    return `${context.prefix}.boolean()`;
  }

  toJSON() {
    return { type: "boolean" };
  }

  toType(context: Context) {
    return "boolean";
  }
}

class StringNode extends ASTNode<string> {
  toFuzz() {
    return fuzz.string();
  }

  toString(context: Context) {
    return `${context.prefix}.string()`;
  }

  toJSON() {
    return { type: "string" };
  }

  toType(context: Context) {
    return "string";
  }
}

class UuidNode extends ASTNode<string> {
  toFuzz() {
    return fuzz.uuid();
  }

  toString(context: Context) {
    return `${context.prefix}.uuid()`;
  }

  toJSON() {
    return { type: "uuid" };
  }

  toType(context: Context) {
    return "string";
  }
}

class AnyNode extends ASTNode<any> {
  toFuzz() {
    return fuzz.any();
  }

  toString(context: Context) {
    return `${context.prefix}.any()`;
  }

  toJSON() {
    return { type: "any" };
  }

  toType(context: Context) {
    return "any";
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

  toString(context: Context) {
    const { prefix, withTypes } = context;
    const elements = this.elements.toString(context);
    return `${prefix}.array${withTypes ? `<${this.elements.toType(context)}>` : ""}(${elements})`;
  }

  toJSON() {
    const elements = this.elements.toJSON();
    return { type: "array", elements };
  }

  toType(context: Context) {
    return `(${this.elements.toType(context)})[]`;
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

  toString(context: Context) {
    const { prefix, withTypes } = context;
    const elements = this.elements.map(el => el.toString(context));
    return `${prefix}.tuple${withTypes ? `<${this.toType(context)}>` : ""}([${elements.join(
      ", "
    )}])`;
  }

  toJSON() {
    const elements = this.elements.map(el => el.toJSON());
    return { type: "tuple", elements };
  }

  toType(context: Context) {
    const elements = this.elements.map(el => el.toType(context));
    return `[${elements.join(", ")}]`;
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

  toString(context: Context) {
    const elements = this.elements.map(el => el.toString(context));
    return `${context.prefix}.oneOf([${elements.join(", ")}])`;
  }

  toJSON() {
    const elements = this.elements.map(el => el.toJSON());
    return { type: "oneOf", elements };
  }

  toType(context: Context) {
    const elements = this.elements.map(el => el.toType(context));
    return elements.join(" | ");
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

  toString(context: Context) {
    const { prefix, withTypes } = context;
    const elements = this.elements.map(el => el.toString(context));
    // prettier-ignore
    return `${prefix}.spread${withTypes ? `<${this.toType(context)}>` : ""}([${elements.join(", ")}])`;
  }

  toJSON() {
    const elements = this.elements.map(el => el.toJSON());
    return { type: "spread", elements };
  }

  toType(context: Context) {
    const elements = this.elements.map(el => el.toType(context));
    return elements.join(" & ");
  }
}

class ReturnNode<T> extends ASTNode<T> {
  constructor(private readonly element: T) {
    super();
  }

  toFuzz() {
    return fuzz.return(this.element);
  }

  toString(context: Context) {
    return `${context.prefix}.return(${JSON.stringify(this.element)})`;
  }

  toJSON() {
    const element = JSON.parse(JSON.stringify(this.element));
    return { type: "return", element };
  }

  toType(context: Context) {
    return JSON.stringify(this.element);
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

  toString(context: Context) {
    const { prefix, withTypes } = context;
    const result = this.elements.reduce(
      (acc, element) => {
        const [key, node] = element;
        return acc.concat(`"${key}": ${node.toString(context)}`);
      },
      [] as string[]
    );

    // prettier-ignore
    return `${prefix}.object${withTypes ? `<${this.toType(context)}>` : ""}({ ${result.join(", ")} })`;
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

  toType(context: Context) {
    const result = this.elements.reduce(
      (acc, element) => {
        const [key, node] = element;
        return acc.concat(`"${key}": ${node.toType(context)}`);
      },
      [] as string[]
    );

    return `{ ${result.join(", ")} }`;
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
      return new ReturnNode("JSON SERIALIZER NOT IMPLEMENTED");
  }
};
