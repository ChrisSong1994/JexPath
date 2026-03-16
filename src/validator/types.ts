export enum TokenType {
  Integer = "Integer", // 整数
  Float = "Float", // 浮点数
  String = "String", // 字符串
  Boolean = "Boolean", // 布尔值
  Identifier = "Identifier", // 标识符
  JSONPath = "JSONPath", // JSONPath 表达式
  Regex = "Regex", // 正则表达式
  Operator = "Operator", // 运算符
  Punctuation = "Punctuation", // 标点符号
  Object = "Object", // 对象字面量
  Array = "Array", // 数组字面量
  EOF = "EOF", // 文件结束
}

export interface Token {
  type: TokenType; // Token 类型
  value: string | number | boolean; // Token 值
  line: number; // 行号
  column: number; // 列号
  start: number; // 起始位置
  end: number; // 结束位置
}

export type NodeType =
  | "Literal" // 字面量
  | "Identifier" // 标识符
  | "JSONPath" // JSONPath 节点
  | "CallExpression" // 函数调用表达式
  | "BinaryExpression" // 二元表达式
  | "LogicalExpression" // 逻辑表达式
  | "ConditionalExpression" // 条件表达式
  | "UnaryExpression" // 一元表达式
  | "MemberExpression" // 成员表达式
  | "ObjectLiteral" // 对象字面量
  | "ArrayLiteral"; // 数组字面量

export interface Node {
  type: NodeType; // 节点类型
  start: number; // 起始位置
  end: number; // 结束位置
}

export interface MemberExpression extends Node {
    type: "MemberExpression";
    object: Node; // 对象
    property: Identifier; // 属性
}

export interface Literal extends Node {
  type: "Literal";
  value: string | number | boolean; // 字面量值
  raw: string; // 原始字符串
}

export interface Identifier extends Node {
  type: "Identifier";
  name: string; // 标识符名称
}

export interface JSONPathNode extends Node {
  type: "JSONPath";
  value: string; // JSONPath 字符串
}

export interface CallExpression extends Node {
  type: "CallExpression";
  callee: Identifier; // 被调用函数
  arguments: Node[]; // 参数列表
}

export interface BinaryExpression extends Node {
  type: "BinaryExpression";
  operator: string; // 运算符
  left: Node; // 左操作数
  right: Node; // 右操作数
}

export interface LogicalExpression extends Node {
  type: "LogicalExpression";
  operator: string; // 运算符 (&&, ||)
  left: Node; // 左操作数
  right: Node; // 右操作数
}

export interface ConditionalExpression extends Node {
  type: "ConditionalExpression";
  test: Node; // 测试条件
  consequent: Node; // 真值表达式
  alternate: Node; // 假值表达式
}

export interface UnaryExpression extends Node {
  type: "UnaryExpression";
  operator: string; // 运算符 (!)
  argument: Node; // 操作数
}

export interface ObjectLiteral extends Node {
  type: "ObjectLiteral";
  properties: Map<string | number, Node>; // 对象属性
  raw: string; // 原始字符串
}

export interface ArrayLiteral extends Node {
  type: "ArrayLiteral";
  elements: Node[]; // 数组元素
  raw: string; // 原始字符串
}

export class SyntaxError extends Error {
  constructor(
    message: string, // 错误信息
    public line: number, // 行号
    public column: number, // 列号
    public expected?: string[] // 期望的 token
  ) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = "SyntaxError";
  }
}
