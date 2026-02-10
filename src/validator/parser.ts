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

const ALLOWED_BINARY_OPS = new Set([
  "+",
  "-",
  "*",
  "/",
  "%",
  "**",
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
]);

const ALLOWED_LOGICAL_OPS = new Set(["&&", "||"]);

export class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(input: string) {
    const lexer = new Lexer(input);
    this.tokens = lexer.tokenize();
  }

  parse(): Node {
    const node = this.parseExpression();
    if (!this.isAtEnd()) {
      throw new SyntaxError(
        "Unexpected token after expression",
        this.peek().line,
        this.peek().column
      );
    }
    return node;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private check(type: TokenType, value?: string): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (token.type !== type) return false;
    if (value !== undefined && token.value !== value) return false;
    return true;
  }

  private consumeValue(type: TokenType, value: string, message: string): Token {
    if (this.check(type, value)) return this.advance();
    throw new SyntaxError(
      message,
      this.peek().line,
      this.peek().column
    );
  }

  private parseExpression(): Node {
    return this.parseConditional();
  }

  // 条件 ? 真表达式 : 假表达式
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

    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const token = this.peek();

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

    if (token.type === TokenType.JSONPath) {
      this.advance();
      return {
        type: "JSONPath",
        value: token.value as string,
        start: token.start,
        end: token.end,
      } as JSONPathNode;
    }

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

    if (this.check(TokenType.Punctuation, "(")) {
      const startToken = this.advance();
      const expr = this.parseExpression();
      const endToken = this.consumeValue(TokenType.Punctuation, ")", "Expected ')'");
      // 保留分组？Jexl AST 通常没有 GroupExpression，只有结构。
      // 但为了源映射，我们可能需要它。
      // 除非需要 GroupExpression，否则返回内部表达式是 AST 的标准做法。
      // 用户规范没有列出 GroupExpression。
      // 我将返回 expr，但可能会更新 start/end？
      // 实际上，AST 节点有 start/end。
      // 如果我返回 `expr`，它有自己的 start/end。
      // 如果我想表示 `(a+b)`，我应该返回 `expr` 但调整位置吗？
      // 不，`(a+b)` 在结构上与 `a+b` 相同。
      return expr;
    }

    throw new SyntaxError(
      `Unexpected token '${token.value}'`,
      token.line,
      token.column
    );
  }
}
