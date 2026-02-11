import {
  Token,
  TokenType,
  Node,
  Literal,
  Identifier,
  JSONPathNode,
  CallExpression,
  BinaryExpression,
  LogicalExpression,
  ConditionalExpression,
  UnaryExpression,
  MemberExpression,
  SyntaxError,
} from "./types.js";
import { Lexer } from "./lexer.js";

const ALLOWED_FUNCTIONS = new Set([
  "SIZE",
  "REPLACE",
  "TRIM",
  "DATE",
  "PARSE_JSON",
]);

export class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(input: string) {
    const lexer = new Lexer(input);
    this.tokens = lexer.tokenize();
  }

  // 解析入口：开始解析表达式
  parse(): Node {
    const node = this.parseExpression();
    // 确保解析完表达式后没有剩余的 token
    if (!this.isAtEnd()) {
      throw new SyntaxError(
        "Unexpected token after expression",
        this.peek().line,
        this.peek().column
      );
    }
    return node;
  }

  // 查看当前 token，不移动指针
  private peek(): Token {
    return this.tokens[this.pos];
  }

  // 消费当前 token 并移动指针
  private advance(): Token {
    return this.tokens[this.pos++];
  }

  // 检查是否到达文件末尾
  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  // 检查当前 token 类型和值是否匹配
  private check(type: TokenType, value?: string): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (token.type !== type) return false;
    if (value !== undefined && token.value !== value) return false;
    return true;
  }

  // 消费指定类型的 token，如果匹配失败则抛出错误
  private consumeValue(type: TokenType, value: string, message: string): Token {
    if (this.check(type, value)) return this.advance();
    throw new SyntaxError(
      message,
      this.peek().line,
      this.peek().column
    );
  }

  // 解析表达式（优先级最低）
  private parseExpression(): Node {
    return this.parseConditional();
  }

  // 解析条件表达式 (条件 ? 真值 : 假值)
  // 优先级：低于逻辑或
  private parseConditional(): Node {
    const expr = this.parseLogicalOR();

    if (this.check(TokenType.Operator, "?")) {
      const op = this.advance();
      const trueExpr = this.parseExpression(); // 允许嵌套条件
      this.consumeValue(TokenType.Operator, ":", "Expected ':' in conditional expression");
      const falseExpr = this.parseConditional(); // 右结合

      return {
        type: "ConditionalExpression",
        test: expr,
        consequent: trueExpr,
        alternate: falseExpr,
        start: expr.start,
        end: falseExpr.end,
      } as ConditionalExpression;
    }

    return expr;
  }

  // 解析逻辑或 (||)
  // 优先级：低于逻辑与
  private parseLogicalOR(): Node {
    let left = this.parseLogicalAND();

    while (this.check(TokenType.Operator, "||")) {
      const op = this.advance();
      const right = this.parseLogicalAND();
      left = {
        type: "LogicalExpression",
        operator: "||",
        left,
        right,
        start: left.start,
        end: right.end,
      } as LogicalExpression;
    }

    return left;
  }

  // 解析逻辑与 (&&)
  // 优先级：低于相等比较
  private parseLogicalAND(): Node {
    let left = this.parseEquality();

    while (this.check(TokenType.Operator, "&&")) {
      const op = this.advance();
      const right = this.parseEquality();
      left = {
        type: "LogicalExpression",
        operator: "&&",
        left,
        right,
        start: left.start,
        end: right.end,
      } as LogicalExpression;
    }

    return left;
  }

  // 解析相等比较 (==, !=)
  // 优先级：低于关系比较
  private parseEquality(): Node {
    let left = this.parseRelational();

    while (this.check(TokenType.Operator) && ["==", "!="].includes(this.peek().value as string)) {
      const op = this.advance();
      const right = this.parseRelational();
      left = {
        type: "BinaryExpression",
        operator: op.value as string,
        left,
        right,
        start: left.start,
        end: right.end,
      } as BinaryExpression;
    }

    return left;
  }

  // 解析关系比较 (>, <, >=, <=)
  // 优先级：低于加减法
  private parseRelational(): Node {
    let left = this.parseAdditive();

    while (this.check(TokenType.Operator) && [">", "<", ">=", "<="].includes(this.peek().value as string)) {
      const op = this.advance();
      const right = this.parseAdditive();
      left = {
        type: "BinaryExpression",
        operator: op.value as string,
        left,
        right,
        start: left.start,
        end: right.end,
      } as BinaryExpression;
    }

    return left;
  }

  // 解析加减法 (+, -)
  // 优先级：低于乘除法
  private parseAdditive(): Node {
    let left = this.parseMultiplicative();

    while (this.check(TokenType.Operator) && ["+", "-"].includes(this.peek().value as string)) {
      const op = this.advance();
      const right = this.parseMultiplicative();
      left = {
        type: "BinaryExpression",
        operator: op.value as string,
        left,
        right,
        start: left.start,
        end: right.end,
      } as BinaryExpression;
    }

    return left;
  }

  // 解析乘除法 (*, /, %)
  // 优先级：低于指数运算
  private parseMultiplicative(): Node {
    let left = this.parseExponentiation();

    while (this.check(TokenType.Operator) && ["*", "/", "%"].includes(this.peek().value as string)) {
      const op = this.advance();
      const right = this.parseExponentiation();
      left = {
        type: "BinaryExpression",
        operator: op.value as string,
        left,
        right,
        start: left.start,
        end: right.end,
      } as BinaryExpression;
    }

    return left;
  }

  // 解析指数运算 (**)
  // 优先级：低于一元运算
  private parseExponentiation(): Node {
    let left = this.parseUnary();

    while (this.check(TokenType.Operator, "**")) {
      const op = this.advance();
      const right = this.parseExponentiation(); // 右结合
      left = {
        type: "BinaryExpression",
        operator: "**",
        left,
        right,
        start: left.start,
        end: right.end,
      } as BinaryExpression;
    }

    return left;
  }

  // 解析一元运算 (!)
  // 优先级：低于后置运算（成员访问）
  private parseUnary(): Node {
    if (this.check(TokenType.Operator, "!")) {
      const op = this.advance();
      const arg = this.parseUnary();
      return {
        type: "UnaryExpression",
        operator: "!",
        argument: arg,
        start: op.start,
        end: arg.end,
      } as UnaryExpression;
    }

    return this.parsePostfix();
  }

  // 解析后置运算 (成员访问 .)
  // 优先级：低于基本元素（字面量、标识符、分组）
  private parsePostfix(): Node {
    let node = this.parsePrimary();

    while (this.check(TokenType.Punctuation, ".")) {
      this.advance(); // consume .
      
      const token = this.peek();
      if (token.type !== TokenType.Identifier) {
           throw new SyntaxError(
             "Expected identifier after '.'",
             token.line,
             token.column
           );
      }
      const name = token.value as string;
      this.advance();

      const property: Identifier = {
          type: "Identifier",
          name,
          start: token.start,
          end: token.end
      };

      node = {
          type: "MemberExpression",
          object: node,
          property,
          start: node.start,
          end: property.end
      } as MemberExpression;
    }
    return node;
  }

  // 解析基本元素 (字面量, 标识符, 分组表达式, JSONPath)
  private parsePrimary(): Node {
    const token = this.peek();

    // 字面量处理
    if (token.type === TokenType.Integer || token.type === TokenType.Float || token.type === TokenType.String || token.type === TokenType.Boolean) {
      this.advance();
      return {
        type: "Literal",
        value: token.value,
        raw: token.value.toString(),
        start: token.start,
        end: token.end,
      } as Literal;
    }

    // JSONPath 处理
    if (token.type === TokenType.JSONPath) {
      this.advance();
      return {
        type: "JSONPath",
        value: token.value as string,
        start: token.start,
        end: token.end,
      } as JSONPathNode;
    }

    // 正则表达式处理
    if (token.type === TokenType.Regex) {
      this.advance();
      return {
        type: "Literal",
        value: token.value,
        raw: token.value as string,
        start: token.start,
        end: token.end,
      } as Literal;
    }

    // 标识符处理 (变量或函数调用)
    if (token.type === TokenType.Identifier) {
      const name = token.value as string;
      this.advance();

      // 检查函数调用
      if (this.check(TokenType.Punctuation, "(")) {
        if (!ALLOWED_FUNCTIONS.has(name)) {
          throw new SyntaxError(
            `Function '${name}' is not allowed`,
            token.line,
            token.column
          );
        }

        this.advance(); // 消费 (
        const args: Node[] = [];
        if (!this.check(TokenType.Punctuation, ")")) {
          do {
            args.push(this.parseExpression());
          } while (this.check(TokenType.Punctuation, ",") && this.advance());
        }
        const closingParen = this.consumeValue(TokenType.Punctuation, ")", "Expected ')' after arguments");

        return {
          type: "CallExpression",
          callee: {
            type: "Identifier",
            name,
            start: token.start,
            end: token.end,
          },
          arguments: args,
          start: token.start,
          end: closingParen.end,
        } as CallExpression;
      }

      // 强制：属性访问必须以 '$' 开头
      // 允许 'null' 和 'undefined' 作为标识符（实际上是字面量）
      if (name !== "null" && name !== "undefined") {
        throw new SyntaxError(
            "Property access must start with '$'",
            token.line,
            token.column
        );
      }

      return {
        type: "Identifier",
        name,
        start: token.start,
        end: token.end,
      } as Identifier;
    }

    // 分组表达式 (...)
    if (this.check(TokenType.Punctuation, "(")) {
      const startToken = this.advance();
      const expr = this.parseExpression();
      const endToken = this.consumeValue(TokenType.Punctuation, ")", "Expected ')'");
      return expr;
    }

    throw new SyntaxError(
      `Unexpected token '${token.value}'`,
      token.line,
      token.column
    );
  }
}
