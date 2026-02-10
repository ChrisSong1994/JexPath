import { describe, it, expect } from "vitest";
import JexPath from "../src/index";

describe("表达式计算引擎", () => {
  const data = {
    a: 1,
    object: { arr: [10, 20, 30] },
    "json-str": '{"score": 100}',
    items: [
      { id: 1, val: 5 },
      { id: 2, val: 10 },
    ],
    c: "100 $",
    timestamp: 1672531200000,
  };

  const myEngine = new JexPath(data);

  it("取值计算", async () => {
    // 逻辑：取 items 里 val > 6 的项的 val，加上 a
    const result = await myEngine.run("$.items[?(@.val > 6)].val + $.a");
    // items[1].val is 10. 10 + 1 = 11.
    expect(result).toBe(11);
  });

  it("PARSE_JSON 解析JSON字符串并计算", async () => {
    // 逻辑：解析字符串后取值，再跟基础变量计算
    // 注意：在严格模式下，不允许使用 .score 访问属性。
    const result = await myEngine.run("PARSE_JSON($['json-str']).score * $.a");
    expect(result).toBe(100);
  });

  // 隐式转换数字计算
  it("隐式转换数字计算", async () => {
    // 逻辑：将 c 中的 $ 转换为 100 美元
    const result = await myEngine.run("(REPLACE($.c, '$', '')) * 7");
    // 100 $ -> 100 100
    console.log(result);
    expect(result).toBe(700);
  });

  // 字符替换和去空格
  it("字符替换和去空格", async () => {
    // 逻辑：将 c 中的 $ 替换为 100 美元
    const result = await myEngine.run("TRIM(REPLACE($.c, '$', ''))");
    // 100 $ -> 100 100
    expect(result).toBe("100");
  });

  // 时间格式
  it("时间格式", async () => {
    // 逻辑：将 timestamp 转换为日期字符串
    const result = await myEngine.run("DATE($.timestamp, 'YYYY-MM-DD')");
    // 2023-01-01
    expect(result).toBe("2023-01-01");
  });

  it("validate 方法测试", () => {
    // 合法
    expect(myEngine.validate("1 + 1")).toBe(true);
    expect(myEngine.validate("SIZE('abc') > 0")).toBe(true);

    // 非法语法
    expect(myEngine.validate("1 +")).toBe(false);
    expect(myEngine.validate("UNKNOWN()")).toBe(false);
  });
});
