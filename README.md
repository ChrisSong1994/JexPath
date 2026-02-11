# JexPath

这是一个基于Jexl 和 JSONPath 的表达式解析器

## 功能

- 解析和执行Jexl表达式
- 解析和执行JSONPath表达式
- 支持变量和函数调用
- 支持隐式类型转换
- 支持字符串替换
- 支持解析 JSON 字符串

## 技术核心

JexPath 是一个严格模式的表达式引擎，深度结合了 Jexl 的运算能力和 JSONPath 的查询能力，旨在提供安全、可预测的 JSON 数据处理方案。

### 1. 架构设计

系统采用经典的分层架构：

*   **Lexer (词法分析器)**:
    *   负责将输入字符串转换为 Token 流。
    *   特殊处理 JSONPath 标记（`$` 开头），能够识别复杂的嵌套结构（如 `$.store.book[?(@.price < 10)]`）。
*   **Parser (语法解析器)**:
    *   采用递归下降算法（Recursive Descent）构建 AST（抽象语法树）。
    *   **严格语法校验**: 在解析阶段强制执行规范，例如所有属性访问必须显式以 `$` 开头，禁止不明确的隐式访问。
*   **Semantic Analyzer (语义分析器)**:
    *   对 AST 进行静态语义分析。
    *   **类型检查**: 确保运算符左右两侧的数据类型兼容（例如禁止 `数字 - 字符串`）。
    *   **函数验证**: 检查内置函数调用的参数数量和参数字面量类型。
*   **Runtime (运行时)**:
    1.  **预处理**: 扫描并提取表达式中的 JSONPath 查询。
    2.  **数据获取**: 使用 `jsonpath-plus` 高效执行查询，支持标准 JSONPath 语法。
    3.  **计算**: 将查询结果注入上下文，利用定制的 Jexl 引擎完成最终的逻辑运算和函数调用。

### 2. 关键特性

*   **严格模式 (Strict Mode)**:
    *   禁用 Jexl 原生的管道符 (`|`) 和 Transform 语法，统一使用函数式调用风格。
    *   禁止未定义的变量隐式访问，所有数据必须来源于 `$` 根节点。
*   **增强的 JSONPath 支持**:
    *   支持过滤器表达式中的当前节点引用 (`@`)。
    *   支持对 `PARSE_JSON` 等函数返回结果进行链式属性访问（MemberExpression）。

## 使用

1. 安装依赖

```bash
npm install @fett/jexpath
```

2. 引入模块

```javascript
import JexPath from '@fett/jexpath';
```

3. 创建实例

```javascript
const myEngine = new JexPath(data);
```

4. 执行表达式

```javascript
const result = await myEngine.run('$.a + $.b');
```