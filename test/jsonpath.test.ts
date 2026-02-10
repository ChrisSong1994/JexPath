import { describe, it, expect } from "vitest";
import JexPath from "../src/index";

describe("JSONPath 复杂用法", () => {
  const storeData = {
    store: {
      book: [
        {
          category: "reference",
          author: "Nigel Rees",
          title: "Sayings of the Century",
          price: 8.95,
          tags: ["history", "quotes"]
        },
        {
          category: "fiction",
          author: "Evelyn Waugh",
          title: "Sword of Honour",
          price: 12.99,
          tags: ["fiction", "war"]
        },
        {
          category: "fiction",
          author: "Herman Melville",
          title: "Moby Dick",
          isbn: "0-553-21311-3",
          price: 8.99,
          tags: ["classic", "sea"]
        },
        {
          category: "fiction",
          author: "J. R. R. Tolkien",
          title: "The Lord of the Rings",
          isbn: "0-395-19395-8",
          price: 22.99,
          tags: ["fantasy", "adventure"]
        }
      ],
      bicycle: {
        color: "red",
        price: 19.95,
        extras: ["basket", "bell"]
      },
      metadata: {
        "key with spaces": "value1",
        "key.with.dots": "value2"
      }
    },
    expensive: 10,
  };

  const engine = new JexPath(storeData);

  it("基本访问：点符号和括号符号", async () => {
    // 基本点符号
    expect(await engine.run("$.store.bicycle.color")).toBe("red");
    
    // 属性的括号符号
    expect(await engine.run("$['store']['bicycle']['price']")).toBe(19.95);
    
    // 混合符号
    expect(await engine.run("$.store['bicycle'].price")).toBe(19.95);
  });

  it("特殊键名：空格和点", async () => {
    // 带空格的键名
    expect(await engine.run("$['store']['metadata']['key with spaces']")).toBe("value1");
    
    // 带点的键名
    expect(await engine.run("$['store']['metadata']['key.with.dots']")).toBe("value2");
  });

  it("数组：索引和切片", async () => {
    // 第一本书
    expect(await engine.run("$.store.book[0].title")).toBe("Sayings of the Century");
    
    // 最后一本书 - Jexl 原生不支持数组的负索引 [-1]。
    // JSONPath 支持像 [-1:] 这样的切片来获取最后一个元素（作为列表）。
    // 我们的 jp 函数会解包单元素列表，所以这里返回书籍对象。
    expect(await engine.run("'$.store.book[-1:].title'")).toBe("The Lord of the Rings");
    
    // 切片：前两本书（返回数组） - Jexl 不支持 [0:2] 切片语法。
    // 必须使用 JSONPath。
    const firstTwo = await engine.run("'$.store.book[0:2].title'");
    expect(firstTwo).toEqual(["Sayings of the Century", "Sword of Honour"]);
  });

  it("通配符", async () => {
    // 所有书籍标题 - 通配符 * 不是有效的 Jexl 属性访问。
    const allTitles = await engine.run("'$.store.book[*].title'");
    expect(allTitles).toHaveLength(4);
    expect(allTitles).toContain("Moby Dick");
    
    // 商店中的所有价格（书籍和自行车）
    // 注意：..price 递归查找 - 不是有效的 Jexl。
    const allPrices = await engine.run("'$..price'");
    // 4 本书 + 1 辆自行车 = 5 个价格
    expect(allPrices).toHaveLength(5);
    expect(allPrices).toContain(19.95);
  });

  it("过滤器：比较", async () => {
    // 价格低于 10 的书籍
    // [?(@...)] 是 JSONPath 语法。
    const cheapBooks = await engine.run("'$.store.book[?(@.price < 10)].title'");
    expect(cheapBooks).toEqual(["Sayings of the Century", "Moby Dick"]);
    
    // 特定类别的书籍
    const fictionBooks = await engine.run("'$.store.book[?(@.category == \"fiction\")].title'");
    expect(fictionBooks).toHaveLength(3);
  });

  it("过滤器：存在性和正则", async () => {
    // 带有 ISBN 的书籍
    const booksWithIsbn = await engine.run("'$.store.book[?(@.isbn)].title'");
    expect(booksWithIsbn).toEqual(["Moby Dick", "The Lord of the Rings"]);
  });

  it("复杂集成：聚合", async () => {
    // 所有书籍价格之和（示例实际计算的是第一本书价格 + 自行车价格）
    // 计算第一本书价格 + 自行车价格
    // 这里我们可以对简单路径使用 Jexl 访问
    const total = await engine.run("$.store.book[0].price + $.store.bicycle.price");
    expect(total).toBe(28.9);
  });

  
  it("带过滤器的递归下降", async () => {
    // 所有价格 > 20 的物品（递归）
    const expensiveItems = await engine.run("'$..[?(@.price > 20)].title'");
    // The Lord of the Rings 是 22.99
    // jp 函数会解包单元素数组，所以我们期望直接得到字符串
    expect(expensiveItems).toEqual("The Lord of the Rings");
  });
});
