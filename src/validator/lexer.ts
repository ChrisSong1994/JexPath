import { Token, TokenType, SyntaxError } from "./types.js";

const OPERATORS = new Set([
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
  "&&",
  "||",
  "!",
  "?",
  ":",
]);

const PUNCTUATION = new Set(["(", ")", ",", "."]);

export class Lexer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      if (/\s/.test(char)) {
        this.consume();
        continue;
      }

      if (/[0-9]/.test(char)) {
        tokens.push(this.readNumber());
        continue;
      }

      if (char === '"' || char === "'") {
        tokens.push(this.readString(char));
        continue;
      }

      if (char === "$") {
        tokens.push(this.readJSONPathOrIdentifier());
        continue;
      }

      if (/[a-zA-Z_]/.test(char)) {
        tokens.push(this.readIdentifier());
        continue;
      }

      if (PUNCTUATION.has(char)) {
        tokens.push({
          type: TokenType.Punctuation,
          value: char,
          line: this.line,
          column: this.column,
          start: this.pos,
          end: this.pos + 1,
        });
        this.consume();
        continue;
      }

      // 处理操作符
      const op = this.readOperator();
      if (op) {
        tokens.push(op);
        continue;
      }

      throw new SyntaxError(
        `Unexpected token '${char}'`,
        this.line,
        this.column
      );
    }

    tokens.push({
      type: TokenType.EOF,
      value: "EOF",
      line: this.line,
      column: this.column,
      start: this.pos,
      end: this.pos,
    });

    return tokens;
  }

  private readJSONPathOrIdentifier(): Token {
    const start = this.pos;
    let buffer = this.input[this.pos];
    this.consume(); // 消费 '$'

    const nextChar = this.input[this.pos];

    if (nextChar === "." || nextChar === "[") {
      let depth = 0;

      while (this.pos < this.input.length) {
        const char = this.input[this.pos];

        if (char === '"' || char === "'") {
          const quote = char;
          buffer += char;
          this.consume();
          while (this.pos < this.input.length) {
            const c = this.input[this.pos];
            buffer += c;
            this.consume();
            if (c === quote) break;
            if (c === "\\") {
              if (this.pos < this.input.length) {
                buffer += this.input[this.pos];
                this.consume();
              }
            }
          }
          continue;
        }

        if (char === "[" || char === "(") depth++;
        if (char === "]" || char === ")") depth--;

        if (depth < 0) {
          depth++;
          break;
        }

        if (depth === 0) {
          if (/\s/.test(char)) break;
          if (OPERATORS.has(char)) {
            const lastBufferChar = buffer[buffer.length - 1];
            if (
              char === "*" &&
              (lastBufferChar === "." || lastBufferChar === "[")
            ) {
              // 允许
            } else {
              break;
            }
          }
          if (PUNCTUATION.has(char) && char !== ".") break;
        }

        buffer += char;
        this.consume();
      }

      if (depth !== 0) {
        throw new SyntaxError(
          "Unterminated JSONPath bracket/paren",
          this.line,
          this.column
        );
      }

      return {
        type: TokenType.JSONPath,
        value: buffer,
        line: this.line,
        column: this.column,
        start,
        end: this.pos,
      };
    } else {
      while (
        this.pos < this.input.length &&
        /[a-zA-Z0-9_$]/.test(this.input[this.pos])
      ) {
        buffer += this.input[this.pos];
        this.consume();
      }
      return {
        type: TokenType.Identifier,
        value: buffer,
        line: this.line,
        column: this.column,
        start,
        end: this.pos,
      };
    }
  }

  private consume() {
    if (this.input[this.pos] === "\n") {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    this.pos++;
  }

  private readNumber(): Token {
    const start = this.pos;
    const startCol = this.column;
    let value = "";
    let hasDot = false;

    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      if (/[0-9]/.test(char)) {
        value += char;
        this.consume();
      } else if (char === "." && !hasDot) {
        value += char;
        hasDot = true;
        this.consume();
      } else {
        break;
      }
    }

    const type = hasDot ? TokenType.Float : TokenType.Integer;
    return {
      type,
      value: parseFloat(value),
      line: this.line,
      column: startCol,
      start,
      end: this.pos,
    };
  }

  private readString(quote: string): Token {
    const start = this.pos;
    const startCol = this.column;
    let value = "";
    this.consume(); // 跳过开头的引号

    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      if (char === quote) {
        this.consume(); // 跳过结尾的引号
        return {
          type: TokenType.String,
          value,
          line: this.line,
          column: startCol,
          start,
          end: this.pos,
        };
      }
      
      // 处理转义引号
      if (char === "\\" && this.input[this.pos + 1] === quote) {
          this.consume(); // 跳过反斜杠
          value += this.input[this.pos]; // 添加引号
          this.consume(); 
          continue;
      }
      
      value += char;
      this.consume();
    }

    throw new SyntaxError("Unterminated string literal", this.line, this.column);
  }

  private readIdentifier(): Token {
    const start = this.pos;
    const startCol = this.column;
    let value = "";

    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      if (/[a-zA-Z0-9_$]/.test(char)) {
        value += char;
        this.consume();
      } else {
        break;
      }
    }

    if (value === "true" || value === "false") {
      return {
        type: TokenType.Boolean,
        value: value === "true",
        line: this.line,
        column: startCol,
        start,
        end: this.pos,
      };
    }

    return {
      type: TokenType.Identifier,
      value,
      line: this.line,
      column: startCol,
      start,
      end: this.pos,
    };
  }

  private readOperator(): Token | null {
    const start = this.pos;
    const startCol = this.column;

    // 优先检查 2 个字符的操作符
    if (this.pos + 1 < this.input.length) {
      const twoChar = this.input.substring(this.pos, this.pos + 2);
      if (OPERATORS.has(twoChar)) {
        this.consume();
        this.consume();
        return {
          type: TokenType.Operator,
          value: twoChar,
          line: this.line,
          column: startCol,
          start,
          end: this.pos,
        };
      }
    }

    // 检查 1 个字符的操作符
    const char = this.input[this.pos];
    if (OPERATORS.has(char)) {
      this.consume();
      return {
        type: TokenType.Operator,
        value: char,
        line: this.line,
        column: startCol,
        start,
        end: this.pos,
      };
    }

    return null;
  }
}
