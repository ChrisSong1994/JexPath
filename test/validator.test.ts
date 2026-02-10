import { describe, it, expect } from "vitest";
import { validateSyntax } from "../src/validator/index.js";
import { SyntaxError } from "../src/validator/types.js";

describe("Strict Syntax Validator", () => {
  describe("Positive Cases", () => {
    it("should validate literals", () => {
      expect(() => validateSyntax("1")).not.toThrow();
      expect(() => validateSyntax("1.5")).not.toThrow();
      expect(() => validateSyntax("'string'")).not.toThrow();
      expect(() => validateSyntax('"string"')).not.toThrow();
      expect(() => validateSyntax("true")).not.toThrow();
      expect(() => validateSyntax("false")).not.toThrow();
    });

    it("should validate arithmetic operations", () => {
      expect(() => validateSyntax("1 + 2")).not.toThrow();
      expect(() => validateSyntax("1 - 2")).not.toThrow();
      expect(() => validateSyntax("1 * 2")).not.toThrow();
      expect(() => validateSyntax("1 / 2")).not.toThrow();
      expect(() => validateSyntax("1 % 2")).not.toThrow();
      expect(() => validateSyntax("2 ** 3")).not.toThrow();
      expect(() => validateSyntax("1 + 2 * 3")).not.toThrow();
      expect(() => validateSyntax("(1 + 2) * 3")).not.toThrow();
    });

    it("should validate comparison operations", () => {
      expect(() => validateSyntax("1 == 1")).not.toThrow();
      expect(() => validateSyntax("1 != 2")).not.toThrow();
      expect(() => validateSyntax("1 > 2")).not.toThrow();
      expect(() => validateSyntax("1 < 2")).not.toThrow();
      expect(() => validateSyntax("1 >= 2")).not.toThrow();
      expect(() => validateSyntax("1 <= 2")).not.toThrow();
      expect(() => validateSyntax("'a' == 'b'")).not.toThrow();
      expect(() => validateSyntax("'a' != 'b'")).not.toThrow();
    });

    it("should validate logical operations", () => {
      expect(() => validateSyntax("true && false")).not.toThrow();
      expect(() => validateSyntax("true || false")).not.toThrow();
      expect(() => validateSyntax("!true")).not.toThrow();
      expect(() => validateSyntax("!(true && false)")).not.toThrow();
    });

    it("should validate conditional operations", () => {
      expect(() => validateSyntax("true ? 1 : 2")).not.toThrow();
      expect(() => validateSyntax("true ? 'a' : 'b'")).not.toThrow();
      expect(() => validateSyntax("true ? (1+1) : (2*2)")).not.toThrow();
      // Nested
      expect(() => validateSyntax("true ? 1 : false ? 2 : 3")).not.toThrow();
    });

    it("should validate function calls", () => {
      expect(() => validateSyntax("SIZE('abc')")).not.toThrow();
      expect(() => validateSyntax("REPLACE('abc', 'a', 'b')")).not.toThrow();
      expect(() => validateSyntax("TRIM(' abc ')")).not.toThrow();
      expect(() => validateSyntax("DATE()")).not.toThrow();
      expect(() => validateSyntax("DATE('YYYY-MM-DD')")).not.toThrow();
      expect(() => validateSyntax("PARSE_JSON('{}')")).not.toThrow();
    });
    
    it("should validate identifiers (variables)", () => {
      expect(() => validateSyntax("var1 + 1")).not.toThrow();
      expect(() => validateSyntax("SIZE(var1)")).not.toThrow();
      expect(() => validateSyntax("var1 ? var2 : var3")).not.toThrow();
    });

    it("should validate JSONPath expressions", () => {
      expect(() => validateSyntax("$.store.book")).not.toThrow();
      expect(() => validateSyntax("$.store.book + 1")).not.toThrow();
      expect(() => validateSyntax("SIZE($.items) > 0")).not.toThrow();
      expect(() => validateSyntax("$['store']['book']")).not.toThrow();
      expect(() => validateSyntax("$.store['book']")).not.toThrow();
      expect(() => validateSyntax("$..book")).not.toThrow();
      expect(() => validateSyntax("$.store.book[*]")).not.toThrow();
      expect(() => validateSyntax("$.store.book[0:2]")).not.toThrow();
      expect(() => validateSyntax("$.store.book[?(@.price < 10)]")).not.toThrow();
      expect(() => validateSyntax("$.a + $.b")).not.toThrow();
    });

    it("should reject invalid JSONPath", () => {
      expect(() => validateSyntax("$.[")).toThrow(SyntaxError);
      // expect(() => validateSyntax("$.")).toThrow(SyntaxError); // $. is root? No, $ is root. $. is invalid.
    });
  });

  describe("Negative Cases (Syntax Errors)", () => {
    it("should reject disallowed characters", () => {
      expect(() => validateSyntax("user.name")).toThrow(SyntaxError); // . forbidden
      expect(() => validateSyntax("arr[0]")).toThrow(SyntaxError); // [ forbidden
      expect(() => validateSyntax("{ a: 1 }")).toThrow(SyntaxError); // { forbidden
      expect(() => validateSyntax("arr | filter")).toThrow(SyntaxError); // | forbidden
    });

    it("should reject disallowed functions", () => {
      expect(() => validateSyntax("UNKNOWN()")).toThrow("Function 'UNKNOWN' is not allowed");
    });

    it("should reject disallowed operators", () => {
        // Bitwise & is not in allowed list, but Lexer treats && as one token.
        // If I write 1 & 1. Lexer will see '&'. Is it allowed?
        // My Lexer only recognizes specific operators.
        // If I write '&', Lexer throws "Unexpected token '&'".
        expect(() => validateSyntax("1 & 1")).toThrow("Unexpected token '&'");
        expect(() => validateSyntax("val = 1")).toThrow("Unexpected token '='"); // = forbidden
    });

    it("should handle lexer edge cases", () => {
        expect(() => validateSyntax("'a\\'b'")).not.toThrow(); // Escaped quote
        expect(() => validateSyntax("'unterm")).toThrow("Unterminated string literal");
        expect(() => validateSyntax("1 \n + 2")).not.toThrow(); // Newline
    });
  });

  describe("Negative Cases (Semantic Errors)", () => {
    it("should reject incorrect argument counts", () => {
      expect(() => validateSyntax("SIZE()")).toThrow("Function 'SIZE' expects 1 argument");
      expect(() => validateSyntax("REPLACE('a', 'b')")).toThrow("Function 'REPLACE' expects 3 arguments");
      expect(() => validateSyntax("TRIM()")).toThrow("Function 'TRIM' expects 1 argument");
      expect(() => validateSyntax("DATE('a', 'b')")).toThrow("Function 'DATE' expects 0 or 1 argument");
      expect(() => validateSyntax("PARSE_JSON()")).toThrow("Function 'PARSE_JSON' expects 1 argument");
    });

    it("should reject incorrect argument types (Literals)", () => {
      expect(() => validateSyntax("SIZE(1)")).toThrow("SIZE argument must be one of [String]");
      expect(() => validateSyntax("REPLACE(1, 'a', 'b')")).toThrow("REPLACE first argument must be one of [String]");
      expect(() => validateSyntax("TRIM(1)")).toThrow("TRIM argument must be one of [String]");
      expect(() => validateSyntax("DATE(1)")).toThrow("DATE argument must be one of [String]");
      expect(() => validateSyntax("PARSE_JSON(1)")).toThrow("PARSE_JSON argument must be one of [String]");
    });

    it("should reject incompatible binary operands", () => {
      expect(() => validateSyntax("1 + 'a'")).toThrow("Operator '+' right operand must be one of [Integer, Float]");
      expect(() => validateSyntax("'a' * 2")).toThrow("Operator '*' left operand must be one of [Integer, Float]");
      expect(() => validateSyntax("true + 1")).toThrow("Operator '+' left operand must be one of [Integer, Float]");
      
      expect(() => validateSyntax("1 && 2")).toThrow("Operator '&&' left operand must be one of [Boolean]");
      expect(() => validateSyntax("true || 1")).toThrow("Operator '||' right operand must be one of [Boolean]");
      
      expect(() => validateSyntax("1 > 'a'")).toThrow("Operator '>' requires operands of compatible types");
      expect(() => validateSyntax("true > false")).toThrow("Operator '>' requires operands of compatible types");
      
      expect(() => validateSyntax("1 == 'a'")).toThrow("Operator '==' requires operands of compatible types");
      
      // Mixed literal/variable checks
      expect(() => validateSyntax("var > true")).toThrow("Operator '>' cannot be applied to Boolean");
      expect(() => validateSyntax("true > var")).toThrow("Operator '>' cannot be applied to Boolean");
    });

    it("should reject malformed expressions", () => {
         expect(() => validateSyntax("1 2")).toThrow("Unexpected token after expression");
         expect(() => validateSyntax("true ? 1")).toThrow("Expected ':' in conditional expression");
         expect(() => validateSyntax("(1")).toThrow("Expected ')'");
     });

    it("should reject non-boolean conditional test", () => {
      expect(() => validateSyntax("1 ? 2 : 3")).toThrow("Conditional test must be one of [Boolean]");
    });
    
    it("should reject non-boolean unary operand", () => {
        expect(() => validateSyntax("!1")).toThrow("Operator '!' operand must be one of [Boolean]");
    });
  });
  
  describe("Performance", () => {
      it("should parse deep nesting within 50ms", () => {
          // Generate 100 level deep expression
          // 1 + (1 + (1 + ...))
          let expr = "1";
          for (let i = 0; i < 100; i++) {
              expr = `1 + (${expr})`;
          }
          
          const start = performance.now();
          validateSyntax(expr);
          const end = performance.now();
          expect(end - start).toBeLessThan(50);
      });
      
      it("should parse deep conditional nesting", () => {
          // true ? (true ? ... : 0) : 0
          let expr = "0";
          for (let i = 0; i < 100; i++) {
              expr = `true ? (${expr}) : 0`;
          }
           const start = performance.now();
          validateSyntax(expr);
          const end = performance.now();
          expect(end - start).toBeLessThan(50);
      });
  });
});
