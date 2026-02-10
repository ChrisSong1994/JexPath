export enum TokenType {
  Integer = "Integer",
  Float = "Float",
  String = "String",
  Boolean = "Boolean",
  Identifier = "Identifier",
  Operator = "Operator",
  Punctuation = "Punctuation",
  EOF = "EOF",
}

export interface Token {
  type: TokenType;
  value: string | number | boolean;
  line: number;
  column: number;
  start: number;
  end: number;
}

export type NodeType =
  | "Literal"
  | "Identifier"
  | "CallExpression"
  | "BinaryExpression"
  | "LogicalExpression"
  | "ConditionalExpression"
  | "UnaryExpression";

export interface Node {
  type: NodeType;
  start: number;
  end: number;
}

export interface Literal extends Node {
  type: "Literal";
  value: string | number | boolean;
  raw: string;
}

export interface Identifier extends Node {
  type: "Identifier";
  name: string;
}

export interface CallExpression extends Node {
  type: "CallExpression";
  callee: Identifier;
  arguments: Node[];
}

export interface BinaryExpression extends Node {
  type: "BinaryExpression";
  operator: string;
  left: Node;
  right: Node;
}

export interface LogicalExpression extends Node {
  type: "LogicalExpression";
  operator: string;
  left: Node;
  right: Node;
}

export interface ConditionalExpression extends Node {
  type: "ConditionalExpression";
  test: Node;
  consequent: Node;
  alternate: Node;
}

export interface UnaryExpression extends Node {
  type: "UnaryExpression";
  operator: string;
  argument: Node;
}

export class SyntaxError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
    public expected?: string[]
  ) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = "SyntaxError";
  }
}
