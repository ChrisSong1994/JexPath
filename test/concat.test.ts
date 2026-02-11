
import { describe, it, expect } from "vitest";
import JexPath from "../src/index";

describe("字符串拼接测试", () => {
  const context = {
    user: {
      firstName: "John",
      lastName: "Doe",
      age: 30
    },
    item: {
      id: 123,
      prefix: "ID-"
    }
  };
  const engine = new JexPath(context);

  it("应该支持使用 + 进行纯字符串拼接", async () => {
    const result = await engine.run("'Hello' + ' ' + 'World'");
    expect(result).toBe("Hello World");
  });

  it("应该支持 JSONPath 变量与字符串拼接", async () => {
    const result = await engine.run("$.user.firstName + ' ' + $.user.lastName");
    expect(result).toBe("John Doe");
  });

  it("应该支持数字与字符串拼接 (隐式转换)", async () => {
    const result = await engine.run("'Age: ' + $.user.age");
    expect(result).toBe("Age: 30");
  });

  it("应该支持复杂表达式拼接", async () => {
    const result = await engine.run("$.item.prefix + $.item.id + ' (' + $.user.firstName + ')'");
    expect(result).toBe("ID-123 (John)");
  });
});
