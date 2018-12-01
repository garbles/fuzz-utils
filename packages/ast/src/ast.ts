import fuzz, { Fuzz } from "@fuzz-utils/fuzz";

type NumberASTNode = { type: "number"; min?: number; max?: number };
type IntegerASTNode = { type: "integer"; min?: number; max?: number };
type FloatASTNode = { type: "float"; min?: number; max?: number };
type BooleanASTNode = { type: "boolean" };
type StringASTNode = { type: "string"; max?: number };
type UuidASTNode = { type: "uuid" };
type AnyASTNode = { type: "any" };
type ArrayASTNode<T> = { type: "array"; elements: T };
type TupleASTNode<T> = { type: "tuple"; elements: T };
type ObjectASTNode<T> = { type: "object"; elements: T };
type OneOfASTNode<T> = { type: "oneOf"; elements: T };
type SpreadASTNode<T> = { type: "spread"; elements: T };
type ReturnASTNode<T> = { type: "return"; elements: T };

type ASTNode<T = any> =
  | NumberASTNode
  | IntegerASTNode
  | FloatASTNode
  | BooleanASTNode
  | StringASTNode
  | UuidASTNode
  | AnyASTNode
  | ArrayASTNode<T>
  | TupleASTNode<T>
  | ObjectASTNode<T>
  | OneOfASTNode<T>
  | SpreadASTNode<T>
  | ReturnASTNode<T>;

type Tag<T, U = any> = T & { __OPAQUE_TAG__: U };
type GetTag<T> = T extends { __OPAQUE_TAG__: infer U } ? U : never;

class Api {
  number(opts: { min?: number; max?: number } = {}): Tag<NumberASTNode, number> {
    return ({
      ...opts,
      type: "number" as "number"
    } as NumberASTNode) as any;
  }

  integer(opts: { min?: number; max?: number } = {}): Tag<IntegerASTNode, number> {
    return ({
      ...opts,
      type: "integer" as "integer"
    } as IntegerASTNode) as any;
  }

  float(opts: { min?: number; max?: number } = {}): Tag<FloatASTNode, number> {
    return ({
      ...opts,
      type: "float" as "float"
    } as FloatASTNode) as any;
  }

  boolean(): Tag<BooleanASTNode, boolean> {
    return ({ type: "boolean" as "boolean" } as BooleanASTNode) as any;
  }

  string(opts: { max?: number } = {}): Tag<StringASTNode, string> {
    return ({ ...opts, type: "string" as "string" } as StringASTNode) as any;
  }

  uuid(): Tag<UuidASTNode, string> {
    return ({ type: "uuid" as "uuid" } as UuidASTNode) as any;
  }

  any(): Tag<AnyASTNode, any> {
    return ({ type: "any" as "any" } as AnyASTNode) as any;
  }

  array<T extends Tag<ASTNode>>(elements: T): Tag<ArrayASTNode<T>, GetTag<T>[]> {
    return ({ elements, type: "array" as "array" } as ArrayASTNode<T>) as any;
  }

  tuple<T extends Tag<ASTNode>>(elements: [T]): Tag<TupleASTNode<[T]>, [GetTag<T>]>;
  tuple<T extends Tag<ASTNode>, U extends Tag<ASTNode>>(
    elements: [T, U]
  ): Tag<TupleASTNode<[T, U]>, [GetTag<T>, GetTag<U>]>;
  tuple<T extends Tag<ASTNode>, U extends Tag<ASTNode>, V extends Tag<ASTNode>>(
    elements: [T, U, V]
  ): Tag<TupleASTNode<[T, U, V]>, [GetTag<T>, GetTag<U>, GetTag<V>]>;
  tuple<
    T extends Tag<ASTNode>,
    U extends Tag<ASTNode>,
    V extends Tag<ASTNode>,
    W extends Tag<ASTNode>
  >(
    elements: [T, U, V, W]
  ): Tag<TupleASTNode<[T, U, V, W]>, [GetTag<T>, GetTag<U>, GetTag<V>, GetTag<W>]>;
  tuple<
    T extends Tag<ASTNode>,
    U extends Tag<ASTNode>,
    V extends Tag<ASTNode>,
    W extends Tag<ASTNode>,
    X extends Tag<ASTNode>
  >(
    elements: [T, U, V, W, X]
  ): Tag<TupleASTNode<[T, U, V, W, X]>, [GetTag<T>, GetTag<U>, GetTag<V>, GetTag<W>, GetTag<X>]>;
  tuple<
    T extends Tag<ASTNode>,
    U extends Tag<ASTNode>,
    V extends Tag<ASTNode>,
    W extends Tag<ASTNode>,
    X extends Tag<ASTNode>,
    Y extends Tag<ASTNode>
  >(
    elements: [T, U, V, W, X, Y]
  ): Tag<
    TupleASTNode<[T, U, V, W, X, Y]>,
    [GetTag<T>, GetTag<U>, GetTag<V>, GetTag<W>, GetTag<X>, GetTag<Y>]
  >;
  tuple<
    T extends Tag<ASTNode>,
    U extends Tag<ASTNode>,
    V extends Tag<ASTNode>,
    W extends Tag<ASTNode>,
    X extends Tag<ASTNode>,
    Y extends Tag<ASTNode>,
    Z extends Tag<ASTNode>
  >(
    elements: [T, U, V, W, X, Y, Z]
  ): Tag<
    TupleASTNode<[T, U, V, W, X, Y, Z]>,
    [
      GetTag<typeof elements[0]>,
      GetTag<typeof elements[1]>,
      GetTag<typeof elements[2]>,
      GetTag<typeof elements[3]>,
      GetTag<typeof elements[4]>,
      GetTag<typeof elements[5]>,
      GetTag<typeof elements[6]>
    ]
  >;
  tuple(elements: Tag<ASTNode>[]): Tag<TupleASTNode<any>, any[]> {
    return ({ elements, type: "tuple" as "tuple" } as TupleASTNode<any>) as any;
  }

  oneOf<T extends Tag<ASTNode>>(elements: [T]): Tag<OneOfASTNode<[T]>, [GetTag<T>]>;
  oneOf<T extends Tag<ASTNode>, U extends Tag<ASTNode>>(
    elements: [T, U]
  ): Tag<OneOfASTNode<[T, U]>, [GetTag<T>, GetTag<U>]>;
  oneOf<T extends Tag<ASTNode>, U extends Tag<ASTNode>, V extends Tag<ASTNode>>(
    elements: [T, U, V]
  ): Tag<OneOfASTNode<[T, U, V]>, [GetTag<T>, GetTag<U>, GetTag<V>]>;
  oneOf<
    T extends Tag<ASTNode>,
    U extends Tag<ASTNode>,
    V extends Tag<ASTNode>,
    W extends Tag<ASTNode>
  >(
    elements: [T, U, V, W]
  ): Tag<OneOfASTNode<[T, U, V, W]>, [GetTag<T>, GetTag<U>, GetTag<V>, GetTag<W>]>;
  oneOf<
    T extends Tag<ASTNode>,
    U extends Tag<ASTNode>,
    V extends Tag<ASTNode>,
    W extends Tag<ASTNode>,
    X extends Tag<ASTNode>
  >(
    elements: [T, U, V, W, X]
  ): Tag<OneOfASTNode<[T, U, V, W, X]>, [GetTag<T>, GetTag<U>, GetTag<V>, GetTag<W>, GetTag<X>]>;
  oneOf<
    T extends Tag<ASTNode>,
    U extends Tag<ASTNode>,
    V extends Tag<ASTNode>,
    W extends Tag<ASTNode>,
    X extends Tag<ASTNode>,
    Y extends Tag<ASTNode>
  >(
    elements: [T, U, V, W, X, Y]
  ): Tag<
    OneOfASTNode<[T, U, V, W, X, Y]>,
    [GetTag<T>, GetTag<U>, GetTag<V>, GetTag<W>, GetTag<X>, GetTag<Y>]
  >;
  oneOf<
    T extends Tag<ASTNode>,
    U extends Tag<ASTNode>,
    V extends Tag<ASTNode>,
    W extends Tag<ASTNode>,
    X extends Tag<ASTNode>,
    Y extends Tag<ASTNode>,
    Z extends Tag<ASTNode>
  >(
    elements: [T, U, V, W, X, Y, Z]
  ): Tag<
    OneOfASTNode<[T, U, V, W, X, Y, Z]>,
    [
      GetTag<typeof elements[0]>,
      GetTag<typeof elements[1]>,
      GetTag<typeof elements[2]>,
      GetTag<typeof elements[3]>,
      GetTag<typeof elements[4]>,
      GetTag<typeof elements[5]>,
      GetTag<typeof elements[6]>
    ]
  >;
  oneOf(elements: Tag<ASTNode>[]): Tag<OneOfASTNode<any>, any[]> {
    return ({ elements, type: "oneOf" as "oneOf" } as OneOfASTNode<any>) as any;
  }

  spread<T extends Tag<ASTNode>>(elements: [T]): Tag<SpreadASTNode<[T]>, [GetTag<T>]>;
  spread<T extends Tag<ASTNode>, U extends Tag<ASTNode>>(
    elements: [T, U]
  ): Tag<SpreadASTNode<[T, U]>, [GetTag<T>, GetTag<U>]>;
  spread<T extends Tag<ASTNode>, U extends Tag<ASTNode>, V extends Tag<ASTNode>>(
    elements: [T, U, V]
  ): Tag<SpreadASTNode<[T, U, V]>, [GetTag<T>, GetTag<U>, GetTag<V>]>;
  spread<
    T extends Tag<ASTNode>,
    U extends Tag<ASTNode>,
    V extends Tag<ASTNode>,
    W extends Tag<ASTNode>
  >(
    elements: [T, U, V, W]
  ): Tag<SpreadASTNode<[T, U, V, W]>, [GetTag<T>, GetTag<U>, GetTag<V>, GetTag<W>]>;
  spread<
    T extends Tag<ASTNode>,
    U extends Tag<ASTNode>,
    V extends Tag<ASTNode>,
    W extends Tag<ASTNode>,
    X extends Tag<ASTNode>
  >(
    elements: [T, U, V, W, X]
  ): Tag<SpreadASTNode<[T, U, V, W, X]>, [GetTag<T>, GetTag<U>, GetTag<V>, GetTag<W>, GetTag<X>]>;
  spread<
    T extends Tag<ASTNode>,
    U extends Tag<ASTNode>,
    V extends Tag<ASTNode>,
    W extends Tag<ASTNode>,
    X extends Tag<ASTNode>,
    Y extends Tag<ASTNode>
  >(
    elements: [T, U, V, W, X, Y]
  ): Tag<
    SpreadASTNode<[T, U, V, W, X, Y]>,
    [GetTag<T>, GetTag<U>, GetTag<V>, GetTag<W>, GetTag<X>, GetTag<Y>]
  >;
  spread<
    T extends Tag<ASTNode>,
    U extends Tag<ASTNode>,
    V extends Tag<ASTNode>,
    W extends Tag<ASTNode>,
    X extends Tag<ASTNode>,
    Y extends Tag<ASTNode>,
    Z extends Tag<ASTNode>
  >(
    elements: [T, U, V, W, X, Y, Z]
  ): Tag<
    SpreadASTNode<[T, U, V, W, X, Y, Z]>,
    [
      GetTag<typeof elements[0]>,
      GetTag<typeof elements[1]>,
      GetTag<typeof elements[2]>,
      GetTag<typeof elements[3]>,
      GetTag<typeof elements[4]>,
      GetTag<typeof elements[5]>,
      GetTag<typeof elements[6]>
    ]
  >;
  spread(elements: Tag<ASTNode>[]): Tag<SpreadASTNode<any>, any[]> {
    return ({ elements, type: "spread" as "spread" } as SpreadASTNode<any>) as any;
  }

  object<T extends { [key: string]: Tag<ASTNode> }>(
    elements: T
  ): Tag<ObjectASTNode<typeof elements>, { [K in keyof T]: GetTag<T[K]> }> {
    return ({ elements, type: "object" as "object" } as ObjectASTNode<T>) as any;
  }

  return<T>(elements: T): Tag<ReturnASTNode<T>, T> {
    return ({ elements, type: "return" as "return" } as ReturnASTNode<T>) as any;
  }

  toFuzzer<T>(node: Tag<ASTNode, T>): Fuzz<any, GetTag<typeof node>>;
  toFuzzer(node: ASTNode): Fuzz<any, any> {
    switch (node.type) {
      case "number":
        return fuzz.number();
      case "integer":
        return fuzz.integer();
      case "float":
        return fuzz.float();
      case "boolean":
        return fuzz.boolean();
      case "string":
        return fuzz.string();
      case "uuid":
        return fuzz.uuid();
      case "any":
        return fuzz.any();
      case "array": {
        const elements: Fuzz<any, any> = this.toFuzzer(node.elements);
        return fuzz.array(elements);
      }
      case "tuple": {
        const elements: Fuzz<any, any>[] = node.elements.map(this.toFuzzer);
        return fuzz.tuple(elements);
      }
      case "object": {
        const keys = Object.keys(node.elements);
        const object = keys.reduce(
          (acc, key) => {
            acc[key] = this.toFuzzer(node.elements[key]);
            return acc;
          },
          {} as any
        );
        return fuzz.object(object);
      }
      case "oneOf": {
        const elements: Fuzz<any, any>[] = node.elements.map(this.toFuzzer);
        return fuzz.oneOf(elements);
      }
      case "spread": {
        const elements: [Fuzz<any, any>, Fuzz<any, any>] = node.elements.map(this.toFuzzer);
        return fuzz.spread(elements);
      }
      case "return":
        return fuzz.return(node.elements);
      default:
        return fuzz.undefined();
    }
  }

  toString(node: ASTNode, apiName = "fuzz"): string {
    switch (node.type) {
      case "number":
        return `${apiName}.number()`;
      case "integer":
        return `${apiName}.integer()`;
      case "float":
        return `${apiName}.float()`;
      case "boolean":
        return `${apiName}.boolean()`;
      case "string":
        return `${apiName}.string()`;
      case "uuid":
        return `${apiName}.uuid()`;
      case "any":
        return `${apiName}.any()`;
      case "array": {
        const elements = this.toString(node.elements, apiName);
        return `${apiName}.array(${elements})`;
      }
      case "tuple": {
        const elements = node.elements.map((e: any) => this.toString(e, apiName));
        return `${apiName}.tuple([${elements.join(", ")}])`;
      }
      case "object": {
        const keys = Object.keys(node.elements);
        const strs = keys.reduce(
          (acc, key) => {
            return acc.concat(`"${key}": ${this.toString(node.elements[key], apiName)}`);
          },
          [] as string[]
        );
        const object = `{ ${strs.join(", ")} }`;

        return `${apiName}.object(${object})`;
      }
      case "oneOf": {
        const elements = node.elements.map((e: any) => this.toString(e, apiName));
        return `${apiName}.oneOf([${elements.join(", ")}])`;
      }
      case "spread": {
        const elements = node.elements.map((e: any) => this.toString(e, apiName));
        return `${apiName}.spread([${elements.join(", ")}])`;
      }
      case "return":
        return `${apiName}.return(${JSON.stringify(node.elements)})`;
      default:
        return `${apiName}.undefined()`;
    }
  }
}

export default new Api();
