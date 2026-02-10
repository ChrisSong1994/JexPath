import {
  Token,
  TokenType,
  Node,
  Literal,
  Identifier,
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

  // condition ? trueExpr : falseExpr
  private parseConditional(): Node {
    const expr = this.parseLogicalOR();

    if (this.check(TokenType.Operator, "?")) {
      const op = this.advance();
      const trueExpr = this.parseExpression(); // Allow nested conditionals
      this.consumeValue(TokenType.Operator, ":", "Expected ':' in conditional expression");
      const falseExpr = this.parseConditional(); // Right associative

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
      const right = this.parseExponentiation(); // Right associative
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

    if (token.type === TokenType.Identifier) {
      const name = token.value as string;
      this.advance();

      // Check for Function Call
      if (this.check(TokenType.Punctuation, "(")) {
        if (!ALLOWED_FUNCTIONS.has(name)) {
          throw new SyntaxError(
            `Function '${name}' is not allowed`,
            token.line,
            token.column
          );
        }

        this.advance(); // consume (
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
      // Preserve grouping? Jexl AST usually doesn't have GroupExpression, just structure.
      // But for source mapping we might want it.
      // Returning inner expr is standard for ASTs unless GroupExpression is needed.
      // The user spec didn't list GroupExpression.
      // I'll return the expr but maybe update start/end?
      // Actually, AST nodes have start/end.
      // If I return `expr`, it has its own start/end.
      // If I want to represent `(a+b)`, I should probably return `expr` but with adjusted location?
      // No, `(a+b)` is structurally same as `a+b`.
      return expr;
    }

    throw new SyntaxError(
      `Unexpected token '${token.value}'`,
      token.line,
      token.column
    );
  }
}
