# JexPath 语法速查

JexPath 是结合 Jexl 计算能力与 JSONPath 查询能力的严格表达式引擎。所有属性访问必须以 `$` 开头。

## 字面量

| 类型 | 示例 |
|------|------|
| 整数 | `1`, `100` |
| 浮点数 | `1.5`, `0.9` |
| 字符串 | `'hello'`, `"world"` |
| 布尔值 | `true`, `false` |
| 正则 | `/\s+/`, `/\s+/g` |

## 数据访问 (JSONPath)

| 语法 | 说明 | 示例 |
|------|------|------|
| `$.a.b` | 点号访问 | `$.store.bicycle.color` |
| `$['a']['b']` | 括号访问 | `$['store']['book']` |
| 混合 | 点号+括号 | `$.store['bicycle'].price` |
| `$.a[0]` | 数组索引 | `$.store.book[0].title` |
| `$.a[-1:]` | 末尾元素 | `'$.store.book[-1:].title'` |
| `$.a[0:2]` | 切片 | `'$.store.book[0:2].title'` |
| `$.a[*]` | 通配符 | `'$.store.book[*].title'` |
| `$..b` | 递归下降 | `'$..price'` |
| `[?(@.x)]` | 过滤器 | `'$.store.book[?(@.price < 10)].title'` |
| `[?(@.x)]` | 存在性过滤 | `'$.store.book[?(@.isbn)].title'` |
| `$..[?()]` | 递归过滤 | `'$..[?(@.price > 20)].title'` |

特殊键名必须使用括号：`$['key with spaces']`、`$['key.with.dots']`

**JSONPath 特殊语法需加引号**：`[*]`、`..`、`[?()]`、`[:]`、`[-1:]` 等必须用单引号包裹。

## 运算符

### 算术：`+` `-` `*` `/` `%` `**`

```
$.price * 0.9
$.a + $.b
$.base ** 2
$.num % 10
```

算术运算要求操作数为数值类型，`1 - 'a'` 会报错。

### 字符串拼接：`+`

```
'Hello' + ' ' + 'World'          // → "Hello World"
$.firstName + ' ' + $.lastName   // → "John Doe"
'Age: ' + $.age                  // → "Age: 30"（隐式转换）
```

`+` 遇到字符串时自动做隐式转换：`'Count: ' + 5` → `"Count: 5"`，`5 + '5'` → `"55"`。

### 比较：`==` `!=` `>` `<` `>=` `<=`

```
$.status == 'active'
$.price > 100
$.age < 18
```

比较运算要求两边类型兼容，`1 == 'a'`、`1 > 'a'` 会报错。

### 逻辑：`&&` `||` `!`

```
$.active && $.verified
$.isAdmin || $.isModerator
!$.blocked
($.age > 18) && ($.active || $.vip)
```

逻辑运算要求操作数为布尔类型，`1 && 2`、`true || 1` 会报错。

### 三元：`? :`

```
$.score > 60 ? 'Pass' : 'Fail'
$.score >= 90 ? 'A' : $.score >= 80 ? 'B' : 'C'
$.price > 100 ? $.price * 0.9 : $.price
```

条件表达式必须为布尔类型，`1 ? 2 : 3` 会报错。

## 内置函数

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `SIZE(val)` | String \| Array | Integer | 字符串长度或数组元素个数 |
| `TRIM(str)` | String | String | 去除首尾空格 |
| `REPLACE(str, search, replace)` | String, String\|Regex, String | String | 替换子串，支持正则 |
| `DATE(val?, fmt?)` | String\|Integer (可选), String (可选) | String | 格式化日期 |
| `PARSE_JSON(str)` | String | Object | 解析 JSON 字符串为对象 |
| `MAPPING(val, mapping)` | Any, Object\|Array | Any | 值映射转换 |

### SIZE

```
SIZE($.items)        // 数组长度
SIZE($.name)         // 字符串长度
SIZE('hello')        // → 5
```

### TRIM

```
TRIM($.name)         // "  hello  " → "hello"
```

### REPLACE

```
REPLACE($.text, 'old', 'new')        // 字符串替换
REPLACE($.text, /\s+/, '-')          // 正则替换（首次）
REPLACE($.text, /\s+/g, '-')         // 正则替换（全局）
REPLACE($.text, /\s+$/, '')          // 去除尾部空格
REPLACE($.text, /\//, '-')           // 转义正则中的 /
```

### DATE

```
DATE()                              // 当前日期
DATE('YYYY-MM-DD')                  // 当前日期，指定格式
DATE($.timestamp, 'YYYY-MM-DD')    // 时间戳 → "2023-01-01"
DATE($.dateStr, 'YYYY-MM-DD HH:mm:ss')
```

### PARSE_JSON

```
PARSE_JSON($.jsonStr)                          // 解析为对象
PARSE_JSON($.meta).lastLogin                   // 解析后访问属性
PARSE_JSON('{"score": 100}').score             // → 100
PARSE_JSON($['json-str']).score * $.a          // 与运算结合
```

### MAPPING

```
MAPPING($.status, {1: '激活', 2: '停用'})       // 对象映射（数字键）
MAPPING($.code, {'A': '优秀', 'B': '良好'})     // 对象映射（字符串键）
MAPPING($.index, ['第一', '第二', '第三'])       // 数组映射（0索引）
MAPPING($.a, $.object.arr)                      // 动态映射源
```

## 语法校验

```typescript
import JexPath from "@fett/jexpath";
import { validateSyntax } from "@fett/jexpath";

// 实例方法：返回 boolean
const engine = new JexPath(data);
engine.validate("SIZE($.items) > 0");  // true
engine.validate("UNKNOWN()");           // false

// 静态方法：抛出详细错误
validateSyntax("SIZE(123)");
// → "SIZE argument must be one of [String]"

validateSyntax("user.name");
// → "Property access must start with '$'"
```

## 规则速记

1. **属性必须 `$` 开头** — `user.name` 非法，`$.user.name` 合法
2. **JSONPath 特殊语法加引号** — `'$.items[*]'` 合法，`$.items[*]` 非法
3. **函数大小写敏感** — `SIZE()` 合法，`size()` 非法
4. **类型严格检查** — `1 - 'a'`、`1 && 2`、`1 ? 2 : 3` 均非法
5. **不允许的运算符** — `&`、`=`、`|`（非 `||`）会被拒绝
6. **仅限内置函数** — `UNKNOWN()` 会报 "Function 'UNKNOWN' is not allowed"
