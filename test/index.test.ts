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
  };

  const myEngine = new JexPath(data);

  it("取值计算", async () => {
    // 逻辑：取 items 里 val > 6 的项的 val，加上 a
    const result = await myEngine.run("'$.items[?(@.val > 6)].val' + $.a");
    // items[1].val is 10. 10 + 1 = 11.
    expect(result).toBe(11);
  });

  it("PARSE_JSON 解析JSON字符串并计算", async () => {
    // 逻辑：解析字符串后取值，再跟基础变量计算
    const result = await myEngine.run("PARSE_JSON($['json-str']).score * $.a");
    // 100 * 1 = 100
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
});
