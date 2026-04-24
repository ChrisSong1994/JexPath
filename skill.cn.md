# JexPath AI 表达式指南

本文档旨在帮助 AI 理解用户需求并生成正确的 JexPath 表达式。

## 概述

JexPath 是一个严格的表达式引擎，结合了 Jexl 的计算能力和 JSONPath 的查询能力。所有属性访问**必须**以 `$`（根引用）开头。

## 快速参考

### 数据访问 (JSONPath)

| 用户意图 | 表达式示例 |
|-------------|-------------------|
| 访问属性 | `$.store.name` |
| 使用括号表示法访问 | `$['store']['name']` |
| 访问数组元素 | `$.items[0]` |
| 访问嵌套属性 | `$.user.address.city` |
| 键名包含特殊字符 | `$['key with spaces']` |

### 数组操作

| 用户意图 | 表达式示例 |
|-------------|-------------------|
| 获取第一个元素 | `$.items[0]` |
| 获取最后一个元素 | `'$.items[-1:]'` |
| 获取范围（前两个） | `'$.items[0:2]'` |
| 获取所有元素 | `'$.items[*]'` |
| 递归搜索 | `'$..price'` |

### 过滤

| 用户意图 | 表达式示例 |
|-------------|-------------------|
| 按条件过滤 | `'$.store.book[?(@.price < 10)]'` |
| 使用 AND 过滤 | `'$.store.book[?(@.price < 10 && @.inStock == true)]'` |
| 使用 OR 过滤 | `'$.items[?(@.status == "active" \|\| @.status == "pending")]'` |
| 检查是否存在 | `'$.store.book[?(@.isbn)]'` |
| 过滤并获取属性 | `'$.store.book[?(@.price < 10)].title'` |

**注意**：JSONPath 过滤表达式使用 `@` 引用当前元素。使用特殊语法时，请将 JSONPath 表达式包裹在引号中。

### 算术运算

| 用户意图 | 表达式示例 |
|-------------|-------------------|
| 加法 | `$.a + $.b` |
| 减法 | `$.price - $.discount` |
| 乘法 | `$.price * 0.9` |
| 除法 | `$.total / $.count` |
| 取模 | `$.num % 10` |
| 幂运算 | `$.base ** 2` |

### 字符串操作

| 用户意图 | 表达式示例 |
|-------------|-------------------|
| 拼接 | `'Hello' + ' ' + $.name` |
| 与数字拼接 | `'Age: ' + $.age` |
| 表达式中的字符串 | `$.prefix + $.id + ' (' + $.name + ')'` |

### 比较运算

| 用户意图 | 表达式示例 |
|-------------|-------------------|
| 等于 | `$.status == 'active'` |
| 不等于 | `$.type != 'admin'` |
| 大于 | `$.price > 100` |
| 小于 | `$.age < 18` |
| 大于等于 | `$.score >= 60` |
| 小于等于 | `$.count <= 10` |

### 逻辑运算

| 用户意图 | 表达式示例 |
|-------------|-------------------|
| 与 (AND) | `$.active && $.verified` |
| 或 (OR) | `$.isAdmin \|\| $.isModerator` |
| 非 (NOT) | `!$.blocked` |
| 复杂逻辑 | `($.age > 18) && ($.active \|\| $.vip)` |

### 条件表达式

| 用户意图 | 表达式示例 |
|-------------|-------------------|
| If-else | `$.score > 60 ? 'Pass' : 'Fail'` |
| 嵌套条件 | `$.score >= 90 ? 'A' : $.score >= 80 ? 'B' : 'C'` |
| 带计算的条件 | `$.price > 100 ? $.price * 0.9 : $.price` |

## 内置函数

### SIZE(val) - 获取长度

返回数组 or 字符串的长度。

```
SIZE($.items)        // 数组长度
SIZE($.name)         // 字符串长度
SIZE('hello')        // 返回 5
```

**参数**：1 个参数（字符串或数组）

### REPLACE(str, search, replace) - 字符串替换

替换字符串中的子串或正则表达式模式。

```
REPLACE($.text, 'old', 'new')           // 简单替换
REPLACE($.text, /\s+/, '-')             // 正则替换
REPLACE($.text, /\s+$/g, '')            // 修剪尾部空格
```

**参数**：3 个参数（字符串、搜索模式、替换字符串）

### TRIM(str) - 去除首尾空格

移除字符串首尾的空白字符。

```
TRIM($.name)         // "  hello  " -> "hello"
TRIM('  test  ')     // 返回 "test"
```

**参数**：1 个参数（字符串）

### DATE(val, format) - 格式化日期

格式化日期字符串或时间戳。

```
DATE($.timestamp, 'YYYY-MM-DD')              // 时间戳转日期
DATE($.dateStr, 'YYYY-MM-DD HH:mm:ss')       // 格式化日期字符串
DATE(1672531200000, 'YYYY-MM-DD')            // 返回 "2023-01-01"
```

**参数**：1-2 个参数（日期值、格式化字符串）

### PARSE_JSON(str) - 解析 JSON 字符串

将 JSON 字符串解析为对象，以便访问其属性。

```
PARSE_JSON($.jsonStr)                          // 返回解析后的对象
PARSE_JSON($.meta).lastLogin                   // 解析后访问属性
PARSE_JSON('{"score": 100}').score             // 返回 100
```

**参数**：1 个参数（JSON 字符串）

### MAPPING(val, mapping) - 值映射

根据映射对象或数组将一个值映射为另一个值。

```
MAPPING($.status, {1: 'Active', 2: 'Inactive'})     // 对象映射
MAPPING($.index, ['First', 'Second', 'Third'])      // 数组映射（从 0 开始索引）
MAPPING($.code, {'A': 'Excellent', 'B': 'Good'})    // 字符串键映射
MAPPING($.a, $.object.arr)                          // 使用数据作为映射
```

**参数**：2 个参数（待映射的值、映射对象/数组）

## 常见模式

### 模式 1：过滤并计算

用户："获取数量大于 5 的商品的总价"

```
'$.items[?(@.quantity > 5)].price'
```

然后对结果求和（如果匹配多个项目）。

### 模式 2：条件折扣

用户："如果价格超过 100，则享受 10% 的折扣，否则不打折"

```
$.price > 100 ? $.price * 0.9 : $.price
```

### 模式 3：字符串格式化

用户："使用前缀和名称创建 ID 字符串"

```
$.prefix + '-' + $.id + ' (' + $.name + ')'
```

### 模式 4：JSON 字符串处理

用户："解析元数据字段并获取 userId"

```
PARSE_JSON($.metadata).userId
```

### 模式 5：值转换

用户："将状态代码 1 转换为 'Active'，2 转换为 'Inactive'"

```
MAPPING($.statusCode, {1: 'Active', 2: 'Inactive'})
```

### 模式 6：日期格式化

用户："将 createdAt 时间戳格式化为 YYYY-MM-DD"

```
DATE($.createdAt, 'YYYY-MM-DD')
```

### 模式 7：复杂过滤

用户："获取价格低于 10 且有库存的书籍标题"

```
'$.store.book[?(@.price < 10 && @.inStock == true)].title'
```

### 模式 8：字符串清理

用户："删除所有空格并转换为小写"

```
TRIM(REPLACE(REPLACE($.text, ' ', ''), /\s+/, ''))
```

## 重要规则

1. **所有属性访问必须以 `$` 开头**
   - 正确：`$.user.name`
   - 错误：`user.name`

2. **对特殊字符使用括号表示法**
   - `$['key with spaces']`
   - `$['key.with.dots']`

3. **JSONPath 特殊语法需要引号**
   - `'$.items[*]'` (不是 `$.items[*]`)
   - `'$..price'` (不是 `$..price`)
   - `'$.items[?(@.active)]'` (不是 `$.items[?(@.active)]`)

4. **+ 运算符会自动进行类型转换**
   - `'Count: ' + 5` 结果为 `"Count: 5"`
   - `5 + '5'` 结果为 `"55"`

5. **过滤表达式使用 `@` 代表当前元素**
   - `@.price` 在过滤器中引用当前项目的价格

6. **函数区分大小写**
   - `SIZE()` 是正确的
   - `size()` 将失败

## 错误预防

| 常见错误 | 正确方法 |
|--------------|-----------------|
| `user.name` | `$.user.name` |
| `$.items[*]` (未加引号) | `'$.items[*]'` |
| `SIZE()` (无参数) | `SIZE($.items)` |
| `1 - 'a'` | 类型不匹配 - 应避免 |
| `UNKNOWN()` | 仅使用内置函数 |

## 表达式生成工作流

当用户描述其需求时：

1. **识别数据源**：正在访问什么数据？
2. **确定操作**：查询、计算、转换还是组合？
3. **选择合适的语法**：
   - 简单属性访问：`$.property`
   - 数组过滤：`'$.array[?(@.condition)]'`
   - 计算：算术运算符
   - 转换：内置函数
4. **按需组合**：嵌套函数、链式操作
5. **验证**：确保所有属性访问以 `$` 开头

## 按用户意图列举的示例

| 用户请求 | 生成的表达式 |
|--------------|---------------------|
| "获取用户名" | `$.user.name` |
| "获取第一件商品的价格" | `$.items[0].price` |
| "获取所有产品名称" | `'$.products[*].name'` |
| "查找年龄大于 18 的用户" | `'$.users[?(@.age > 18)]'` |
| "计算总计：单价乘以数量" | `$.price * $.quantity` |
| "从名字和姓氏获取全名" | `$.firstName + ' ' + $.lastName` |
| "检查用户是否为管理员" | `$.user.role == 'admin'` |
| "获取激活状态标签" | `$.active ? 'Active' : 'Inactive'` |
| "计算列表中的项数" | `SIZE($.items)` |
| "清理文本字段" | `TRIM($.text)` |
| "格式化日期字段" | `DATE($.date, 'YYYY-MM-DD')` |
| "解析 JSON 并获取值" | `PARSE_JSON($.jsonField).targetKey` |
| "将状态码映射为标签" | `MAPPING($.status, {1: 'On', 0: 'Off'})` |
| "获取便宜的书籍标题" | `'$.books[?(@.price < 10)].title'` |
| "计算折扣价" | `$.price > 100 ? $.price * 0.9 : $.price` |
