import { describe, it, expect } from "vitest";
import JexPath from "../src/index";

const context = {
  store: {
    book: [
      {
        category: "reference",
        author: "Nigel Rees",
        title: "Sayings of the Century",
        price: 8.95,
        inStock: true,
      },
      {
        category: "fiction",
        author: "Evelyn Waugh",
        title: "Sword of Honour",
        price: 12.99,
        inStock: false,
      },
      {
        category: "fiction",
        author: "Herman Melville",
        title: "Moby Dick",
        isbn: "0-553-21311-3",
        price: 8.99,
        inStock: true,
      },
      {
        category: "fiction",
        author: "J. R. R. Tolkien",
        title: "The Lord of the Rings",
        isbn: "0-395-19395-8",
        price: 22.99,
        inStock: true,
      },
    ],
    bicycle: {
      color: "red",
      price: 19.95,
      features: ["lights", "bell"],
    },
    hardware: [
      { name: "Hammer", price: 15.0, weight: 1.5 },
      { name: "Drill", price: 85.0, weight: 2.2 },
    ],
  },
  users: [
    {
      name: "John",
      age: 30,
      active: true,
      roles: ["admin", "editor"],
      meta: '{"lastLogin": "2023-10-01"}',
    },
    {
      name: "Jane",
      age: 25,
      active: false,
      roles: ["viewer"],
      meta: '{"lastLogin": "2023-09-15"}',
    },
  ],
  stats: {
    visits: 1024,
    rating: 4.5,
  },
};

describe("JexPath 复杂计算与场景测试", () => {
  const engine = new JexPath(context);

  it("复杂过滤器：价格 < 10 且有库存的书籍标题", async () => {
    const result = await engine.run(
      "$.store.book[?(@.price < 10 && @.inStock == true)].title"
    );
    expect(result).toEqual(["Sayings of the Century", "Moby Dick"]);
  });

  it("数学计算：自行车打九折", async () => {
    const result = await engine.run("$.store.bicycle.price * 0.9");
    expect(result).toBeCloseTo(17.955);
  });

  it("内置函数：统计书籍数量", async () => {
    const result = await engine.run("SIZE($.store.book)");
    expect(result).toBe(4);
  });

  it("内置函数：字符串修剪", async () => {
    // 构造一个临时的带空格上下文
    const tempEngine = new JexPath({ msg: "  Hello  " });
    const result = await tempEngine.run("TRIM($.msg)");
    expect(result).toBe("Hello");
  });

  it("内置函数：JSON 解析与属性访问", async () => {
    const result = await engine.run("PARSE_JSON($.users[0].meta).lastLogin");
    expect(result).toBe("2023-10-01");
  });

  it("条件运算：访问量评价", async () => {
    const result = await engine.run(
      "$.stats.visits > 1000 ? 'Popular' : 'Normal'"
    );
    expect(result).toBe("Popular");
  });

  it("数组元素求和", async () => {
    const result = await engine.run(
      "$.store.hardware[0].price + $.store.hardware[1].price"
    );
    expect(result).toBe(100);
  });
  
  it("逻辑运算：管理员检查", async () => {
      // 检查第一个用户是否活跃且包含 admin 角色
      // 注意：JexPath 目前对于数组包含检查可能需要特定写法，这里测试基本逻辑
      // 假设我们取 roles[0]
      const result = await engine.run("$.users[0].active && $.users[0].roles[0] == 'admin'");
      expect(result).toBe(true);
  });
});
