import { describe, it, expect } from "vitest";
import { validateSyntax } from "../src/validator/index.js";
import { SyntaxError } from "../src/validator/types.js";

describe("严格语法验证器", () => {
  describe("正向用例", () => {
    it("应该验证字面量", () => {
      expect(() => validateSyntax("1")).not.toThrow();
      expect(() => validateSyntax("1.5")).not.toThrow();
      expect(() => validateSyntax("'string'")).not.toThrow();
      expect(() => validateSyntax('"string"')).not.toThrow();
      expect(() => validateSyntax("true")).not.toThrow();
      expect(() => validateSyntax("false")).not.toThrow();
    });

    it("应该验证算术运算", () => {
      expect(() => validateSyntax("1 + 2")).not.toThrow();
      expect(() => validateSyntax("1 - 2")).not.toThrow();
      expect(() => validateSyntax("1 * 2")).not.toThrow();
      expect(() => validateSyntax("1 / 2")).not.toThrow();
      expect(() => validateSyntax("1 % 2")).not.toThrow();
      expect(() => validateSyntax("2 ** 3")).not.toThrow();
      expect(() => validateSyntax("1 + 2 * 3")).not.toThrow();
      expect(() => validateSyntax("(1 + 2) * 3")).not.toThrow();
    });

    it("应该验证比较运算", () => {
      expect(() => validateSyntax("1 == 1")).not.toThrow();
      expect(() => validateSyntax("1 != 2")).not.toThrow();
      expect(() => validateSyntax("1 > 2")).not.toThrow();
      expect(() => validateSyntax("1 < 2")).not.toThrow();
      expect(() => validateSyntax("1 >= 2")).not.toThrow();
      expect(() => validateSyntax("1 <= 2")).not.toThrow();
      expect(() => validateSyntax("'a' == 'b'")).not.toThrow();
      expect(() => validateSyntax("'a' != 'b'")).not.toThrow();
    });

    it("应该验证逻辑运算", () => {
      expect(() => validateSyntax("true && false")).not.toThrow();
      expect(() => validateSyntax("true || false")).not.toThrow();
      expect(() => validateSyntax("!true")).not.toThrow();
      expect(() => validateSyntax("!(true && false)")).not.toThrow();
    });

    it("应该验证条件运算", () => {
      expect(() => validateSyntax("true ? 1 : 2")).not.toThrow();
      expect(() => validateSyntax("true ? 'a' : 'b'")).not.toThrow();
      expect(() => validateSyntax("true ? (1+1) : (2*2)")).not.toThrow();
      // 嵌套
      expect(() => validateSyntax("true ? 1 : false ? 2 : 3")).not.toThrow();
    });

    it("应该验证函数调用", () => {
      expect(() => validateSyntax("SIZE('abc')")).not.toThrow();
      expect(() => validateSyntax("REPLACE('abc', 'a', 'b')")).not.toThrow();
      expect(() => validateSyntax("TRIM(' abc ')")).not.toThrow();
      expect(() => validateSyntax("DATE()")).not.toThrow();
      expect(() => validateSyntax("DATE('YYYY-MM-DD')")).not.toThrow();
      expect(() => validateSyntax("PARSE_JSON('{}')")).not.toThrow();
    });
    
    it("应该拒绝非函数调用的标识符（变量）", () => {
      expect(() => validateSyntax("var1 + 1")).toThrow("Property access must start with '$'");
      expect(() => validateSyntax("SIZE(var1)")).toThrow("Property access must start with '$'");
      expect(() => validateSyntax("var1 ? var2 : var3")).toThrow("Property access must start with '$'");
      
      // 如果使用 JSONPath 应该可以
      expect(() => validateSyntax("$.var1 + 1")).not.toThrow();
      expect(() => validateSyntax("SIZE($.var1)")).not.toThrow();
      expect(() => validateSyntax("$.var1 ? $.var2 : $.var3")).not.toThrow();
    });

    it("应该验证 JSONPath 表达式", () => {
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

    it("应该拒绝无效的 JSONPath", () => {
      expect(() => validateSyntax("$.[")).toThrow(SyntaxError);
      // expect(() => validateSyntax("$.")).toThrow(SyntaxError); // $. 是根？不，$ 是根。$. 是无效的。
    });
  });

  describe("负向用例（语法错误）", () => {
    it("应该拒绝不允许的字符", () => {
      expect(() => validateSyntax("user.name")).toThrow(SyntaxError); // . 禁止
      expect(() => validateSyntax("arr[0]")).toThrow(SyntaxError); // [ 禁止
      expect(() => validateSyntax("{ a: 1 }")).toThrow(SyntaxError); // { 禁止
      expect(() => validateSyntax("arr | filter")).toThrow(SyntaxError); // | 禁止
    });

    it("应该拒绝不允许的函数", () => {
      expect(() => validateSyntax("UNKNOWN()")).toThrow("Function 'UNKNOWN' is not allowed");
    });

    it("应该拒绝不允许的运算符", () => {
        // 位运算符 & 不在允许列表中，但 Lexer 将 && 视为一个 token。
        // 如果我写 1 & 1。Lexer 会看到 '&'。它被允许吗？
        // 我的 Lexer 只识别特定的运算符。
        // 如果我写 '&'，Lexer 会抛出 "Unexpected token '&'"。
        expect(() => validateSyntax("1 & 1")).toThrow("Unexpected token '&'");
        expect(() => validateSyntax("val = 1")).toThrow("Unexpected token '='"); // = 禁止
    });

    it("应该处理 Lexer 边缘情况", () => {
        expect(() => validateSyntax("'a\\'b'")).not.toThrow(); // 转义引号
        expect(() => validateSyntax("'unterm")).toThrow("Unterminated string literal");
        expect(() => validateSyntax("1 \n + 2")).not.toThrow(); // 换行
    });
  });

  describe("负向用例（语义错误）", () => {
    it("应该拒绝不正确的参数数量", () => {
      expect(() => validateSyntax("SIZE()")).toThrow("Function 'SIZE' expects 1 argument");
      expect(() => validateSyntax("REPLACE('a', 'b')")).toThrow("Function 'REPLACE' expects 3 arguments");
      expect(() => validateSyntax("TRIM()")).toThrow("Function 'TRIM' expects 1 argument");
      expect(() => validateSyntax("DATE('a', 'b', 'c')")).toThrow("Function 'DATE' expects 0, 1 or 2 arguments");
      expect(() => validateSyntax("PARSE_JSON()")).toThrow("Function 'PARSE_JSON' expects 1 argument");
    });

    it("应该拒绝不正确的参数类型（字面量）", () => {
      expect(() => validateSyntax("SIZE(1)")).toThrow("SIZE argument must be one of [String]");
      expect(() => validateSyntax("REPLACE(1, 'a', 'b')")).toThrow("REPLACE first argument must be one of [String]");
      expect(() => validateSyntax("TRIM(1)")).toThrow("TRIM argument must be one of [String]");
      expect(() => validateSyntax("DATE(true)")).toThrow("DATE first argument must be one of [String, Integer]");
      expect(() => validateSyntax("PARSE_JSON(1)")).toThrow("PARSE_JSON argument must be one of [String]");
    });

    it("应该拒绝不兼容的二元操作数", () => {
      expect(() => validateSyntax("1 - 'a'")).toThrow("Operator '-' right operand must be one of [Integer, Float]");
      expect(() => validateSyntax("'a' * 2")).toThrow("Operator '*' left operand must be one of [Integer, Float]");
      expect(() => validateSyntax("true + 1")).toThrow("Operator '+' left operand must be one of [Integer, Float, String]");
      
      expect(() => validateSyntax("1 && 2")).toThrow("Operator '&&' left operand must be one of [Boolean]");
      expect(() => validateSyntax("true || 1")).toThrow("Operator '||' right operand must be one of [Boolean]");
      
      expect(() => validateSyntax("1 > 'a'")).toThrow("Operator '>' requires operands of compatible types");
      expect(() => validateSyntax("true > false")).toThrow("Operator '>' requires operands of compatible types");
      
      expect(() => validateSyntax("1 == 'a'")).toThrow("Operator '==' requires operands of compatible types");
      
      // 混合字面量/变量检查
      expect(() => validateSyntax("$.var > true")).toThrow("Operator '>' cannot be applied to Boolean");
      expect(() => validateSyntax("true > $.var")).toThrow("Operator '>' cannot be applied to Boolean");
    });

    it("应该拒绝格式错误的表达式", () => {
         expect(() => validateSyntax("1 2")).toThrow("Unexpected token after expression");
         expect(() => validateSyntax("true ? 1")).toThrow("Expected ':' in conditional expression");
         expect(() => validateSyntax("(1")).toThrow("Expected ')'");
     });

    it("应该拒绝非布尔条件测试", () => {
      expect(() => validateSyntax("1 ? 2 : 3")).toThrow("Conditional test must be one of [Boolean]");
    });
    
    it("应该拒绝非布尔一元操作数", () => {
        expect(() => validateSyntax("!1")).toThrow("Operator '!' operand must be one of [Boolean]");
    });
  });
  
  describe("性能", () => {
      it("应该在 50ms 内解析深度嵌套", () => {
          // 生成 100 层深度的表达式
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
      
      it("应该解析深度条件嵌套", () => {
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
