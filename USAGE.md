# JexPath 使用指南

JexPath 是一个结合了 Jexl 表达式引擎和 JSONPath 数据查询能力的库，允许您在表达式中直接使用 JSONPath 语法来访问和操作深层嵌套的数据。

## 核心功能

1.  **混合语法**：在 Jexl 表达式中无缝嵌入 JSONPath（如 `$.store.book[0].price`）。
2.  **严格校验**：提供内置的语法校验器，支持严格模式的语法检查（仅允许白名单内的函数和运算符）。
3.  **扩展函数**：内置 `SIZE`, `REPLACE`, `TRIM`, `DATE`, `PARSE_JSON` 等实用函数。

## 安装

```bash
npm install @fett/jexpath
# 或
pnpm add @fett/jexpath
```

## 快速开始

### 1. 基础使用

```typescript
import JexPath from "@fett/jexpath";

const data = {
  store: {
    book: [
      { category: "reference", author: "Nigel Rees", title: "Sayings of the Century", price: 8.95 },
      { category: "fiction", author: "Evelyn Waugh", title: "Sword of Honour", price: 12.99 }
    ]
  },
  discount: 0.8
};

// 初始化引擎
const engine = new JexPath(data);

// 执行表达式：计算第一本书折后价格
// 注意：JSONPath 必须以 $ 开头
const result = await engine.run("$.store.book[0].price * $.discount");
console.log(result); // 7.16
```

### 2. 语法校验

JexPath 提供了一个严格的语法校验器，用于在执行前检查表达式是否合法。

**支持的校验规则：**

*   **函数**: `SIZE`, `REPLACE`, `TRIM`, `DATE`, `PARSE_JSON`
*   **算术**: `+`, `-`, `*`, `/`, `%`, `**`
*   **比较**: `==`, `!=`, `>`, `<`, `>=`, `<=`
*   **逻辑**: `&&`, `||`, `!`
*   **三元**: `condition ? true : false`
*   **JSONPath**: 支持完整规范，包括过滤器 `[?(@.price < 10)]`、递归 `..`、切片 `[:]` 等。

**使用方式：**

```typescript
import JexPath from "@fett/jexpath";

const engine = new JexPath({});

// 1. 使用实例方法 validate (返回 boolean)
const isValid = engine.validate("SIZE($.items) > 0");
if (isValid) {
  console.log("语法正确");
} else {
  console.error("语法错误");
}

// 2. 获取具体错误信息 (导入静态方法)
import { validateSyntax } from "@fett/jexpath";

try {
  validateSyntax("SIZE(123)"); // 错误：SIZE 期望字符串或数组
} catch (e) {
  console.error(`错误位置: ${e.line}:${e.column}, 原因: ${e.message}`);
}
```

## 复杂示例

假设我们有一个复杂的电商订单数据，需要根据特定规则计算“高价值订单”的加权得分。

**数据结构：**

```json
{
  "orderId": "ORD-2023-001",
  "user": {
    "level": "VIP",
    "region": "CN"
  },
  "items": [
    { "id": "A1", "name": "Laptop", "price": 5000, "tags": ["electronics", "work"] },
    { "id": "B2", "name": "Coffee", "price": 50, "tags": ["food"] },
    { "id": "C3", "name": "Mouse", "price": 120, "tags": ["electronics"] }
  ],
  "coupon": {
    "type": "discount",
    "value": 0.9
  }
}
```

**业务需求：**

计算订单得分，规则如下：
1.  如果用户是 VIP，基础分为 100，否则为 50。
2.  筛选出所有价格大于 100 的商品（电子产品或高价商品）。
3.  计算这些筛选后商品的总价。
4.  如果筛选后的商品数量超过 2 个，得分翻倍。
5.  最终得分 = (基础分 + 筛选商品总价) * (数量加成 ? 2 : 1)。

**实现代码：**

```typescript
import JexPath from "@fett/jexpath";

const context = {
  order: {
    id: "ORD-2023-001",
    user: { level: "VIP", region: "CN" },
    items: [
      { id: "A1", "name": "Laptop", "price": 5000, "tags": ["electronics"] },
      { id: "B2", "name": "Coffee", "price": 50, "tags": ["food"] },
      { id: "C3", "name": "Mouse", "price": 120, "tags": ["electronics"] },
      { id: "D4", "name": "Monitor", "price": 2000, "tags": ["electronics"] }
    ]
  }
};

const engine = new JexPath(context);

// 复杂表达式
// 1. 使用 JSONPath 过滤器筛选价格 > 100 的商品
// 2. 使用逻辑判断用户等级
// 3. 结合三元运算符计算最终结果
const expression = `
  (
    ($.order.user.level == 'VIP' ? 100 : 50) + 
    SIZE($.order.items[?(@.price > 100)]) * 1000 
  ) * 
  (SIZE($.order.items[?(@.price > 100)]) >= 3 ? 2 : 1)
`;

// 校验语法 (注意：实际使用时建议去除换行或确保解析器支持)
// JexPath 的 Lexer 支持换行符
if (engine.validate(expression)) {
  const score = await engine.run(expression);
  console.log(`订单得分: ${score}`);
}
```

## 内置函数参考

| 函数名 | 参数 | 描述 |
| :--- | :--- | :--- |
| `SIZE(val)` | `val`: String \| Array | 返回字符串长度或数组元素个数 |
| `TRIM(str)` | `str`: String | 去除字符串首尾空格 |
| `REPLACE(str, search, replace)` | `str`: String, `search`: String, `replace`: String | 替换字符串中的子串 |
| `DATE(str?, fmt?)` | `str`: String (可选), `fmt`: String (可选) | 格式化日期或获取当前日期 |
| `PARSE_JSON(str)` | `str`: String | 将 JSON 字符串解析为对象 |
