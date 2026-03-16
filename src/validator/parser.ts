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
  ObjectLiteral,
  ArrayLiteral,
  SyntaxError,
} from "./types.js";
import { Lexer } from "./lexer.js";

const ALLOWED_FUNCTIONS = new Set([
  "SIZE",
  "REPLACE",
  "TRIM",
  "DATE",
  "PARSE_JSON",
  "MAPPING",
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

    // 对象字面量处理
    if (token.type === TokenType.Object) {
      this.advance();
      const raw = token.value as string;
      const properties = this.parseObjectProperties(raw);
      return {
        type: "ObjectLiteral",
        properties,
        raw,
        start: token.start,
        end: token.end,
      } as ObjectLiteral;
    }

    // 数组字面量处理
    if (token.type === TokenType.Array) {
      this.advance();
      const raw = token.value as string;
      const elements = this.parseArrayElements(raw);
      return {
        type: "ArrayLiteral",
        elements,
        raw,
        start: token.start,
        end: token.end,
      } as ArrayLiteral;
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

  // 解析对象字面量的属性
  private parseObjectProperties(raw: string): Map<string | number, Node> {
    const properties = new Map<string | number, Node>();
    
    // 去掉外层的 { }
    const content = raw.slice(1, -1).trim();
    if (!content) {
      return properties;
    }

    // 简单解析：分割键值对
    const pairs = this.splitObjectPairs(content);
    
    for (const pair of pairs) {
      const colonIndex = pair.indexOf(":");
      if (colonIndex === -1) continue;
      
      const keyStr = pair.substring(0, colonIndex).trim();
      const valueStr = pair.substring(colonIndex + 1).trim();
      
      // 解析键
      let key: string | number;
      if (keyStr.startsWith('"') || keyStr.startsWith("'")) {
        key = keyStr.slice(1, -1);
      } else if (/^\d+$/.test(keyStr)) {
        key = parseInt(keyStr, 10);
      } else {
        key = keyStr;
      }
      
      // 解析值（使用子 Parser）
      try {
        const valueParser = new Parser(valueStr);
        const valueNode = valueParser.parse();
        properties.set(key, valueNode);
      } catch (e) {
        // 如果解析失败，作为字面量处理
        properties.set(key, {
          type: "Literal",
          value: valueStr,
          raw: valueStr,
          start: 0,
          end: valueStr.length,
        } as Literal);
      }
    }
    
    return properties;
  }

  // 分割对象键值对（考虑嵌套）
  private splitObjectPairs(content: string): string[] {
    const pairs: string[] = [];
    let current = "";
    let depth = 0;
    let inString = false;
    let stringQuote = "";
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (inString) {
        current += char;
        if (char === "\\" && i + 1 < content.length) {
          current += content[++i];
        } else if (char === stringQuote) {
          inString = false;
        }
        continue;
      }
      
      if (char === '"' || char === "'") {
        inString = true;
        stringQuote = char;
        current += char;
        continue;
      }
      
      if (char === "{" || char === "[" || char === "(") {
        depth++;
      } else if (char === "}" || char === "]" || char === ")") {
        depth--;
      } else if (char === "," && depth === 0) {
        pairs.push(current.trim());
        current = "";
        continue;
      }
      
      current += char;
    }
    
    if (current.trim()) {
      pairs.push(current.trim());
    }
    
    return pairs;
  }

  // 解析数组字面量的元素
  private parseArrayElements(raw: string): Node[] {
    const elements: Node[] = [];
    const content = raw.slice(1, -1).trim(); // 去掉 [ 和 ]
    
    if (!content) return elements;
    
    const items = this.splitArrayItems(content);
    
    for (const item of items) {
      const subParser = new Parser(item);
      const element = subParser.parse();
      elements.push(element);
    }
    
    return elements;
  }

  // 分割数组元素
  private splitArrayItems(content: string): string[] {
    const items: string[] = [];
    let current = "";
    let depth = 0;
    let inString = false;
    let stringQuote = "";
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (inString) {
        current += char;
        if (char === "\\" && i + 1 < content.length) {
          i++;
          current += content[i];
        } else if (char === stringQuote) {
          inString = false;
        }
        continue;
      }
      
      if (char === '"' || char === "'") {
        inString = true;
        stringQuote = char;
        current += char;
        continue;
      }
      
      if (char === "{" || char === "[" || char === "(") {
        depth++;
      } else if (char === "}" || char === "]" || char === ")") {
        depth--;
      } else if (char === "," && depth === 0) {
        items.push(current.trim());
        current = "";
        continue;
      }
      
      current += char;
    }
    
    if (current.trim()) {
      items.push(current.trim());
    }
    
    return items;
  }
}
