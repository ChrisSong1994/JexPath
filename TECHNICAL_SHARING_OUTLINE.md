# 技术分享：如何从零打造一个表达式解析引擎？

> **副标题**：以 JexPath 为例，探索编译原理在前端/Node.js 中的实践

## 1. 引言 (Introduction)
*   **什么是表达式引擎？**
    *   定义：一种能够动态解析并执行字符串形式代码逻辑的工具。
    *   区别：与 `eval` / `new Function` 的安全性与受控性对比。
*   **为什么我们需要它？**
    *   **业务场景**：
        *   低代码/无代码平台 (Low-Code/No-Code) 的逻辑绑定。
        *   动态规则引擎 (风控、营销活动配置)。
        *   配置化的数据转换与清洗。
*   **本次分享目标**：
    *   理解编译原理的核心概念。
    *   掌握手写一个简单解释器的方法。

## 2. 核心概念 (Core Concepts)
*   **编译器 vs 解释器**：
    *   JexPath 属于 AST 解释器模式。
*   **处理流程**：
    `源码 (Source) -> 词法分析 (Lexer) -> 语法分析 (Parser) -> 抽象语法树 (AST) -> 语义分析 (Semantic) -> 执行 (Runtime)`

## 3. 深入剖析：造轮子的四步走 (Implementation Steps)

### 3.1 第一步：词法分析 (Lexical Analysis)
*   **任务**：将“字符流”转换为“Token 流”。
*   **实现细节**：
    *   定义 Token 类型 (`TokenType`)：Identifier, Literal, Operator, Punctuation...
    *   状态机与正则匹配。
    *   **难点案例**：如何区分 `.` 是小数点还是属性访问符？如何处理 JSONPath 的复杂结构 (`$.store.book[?(@.price < 10)]`)？
    *   *JexPath 实践*：[lexer.ts](src/validator/lexer.ts) 中的 Tokenizer 实现。

### 3.2 第二步：语法分析 (Syntactic Analysis)
*   **任务**：将“Token 流”转换为“抽象语法树 (AST)”。
*   **关键算法**：递归下降分析法 (Recursive Descent Parsing)。
*   **核心挑战**：
    *   **运算符优先级 (Precedence)**：为什么 `*` 比 `+` 先执行？(通过函数调用层级控制，如 `parseAdditive` 调用 `parseMultiplicative`)。
    *   **结合性 (Associativity)**：左结合 vs 右结合 (`**` 幂运算)。
*   **AST 结构展示**：
    ```json
    {
      "type": "BinaryExpression",
      "operator": "+",
      "left": { "type": "Literal", "value": 1 },
      "right": { "type": "Identifier", "name": "a" }
    }
    ```
*   *JexPath 实践*：[parser.ts](src/validator/parser.ts) 中的递归下降实现。

### 3.3 第三步：语义分析 (Semantic Analysis)
*   **任务**：确保“语法正确”的句子在“语义”上也是合理的。
*   **静态检查**：
    *   **类型安全**：禁止 `Number + String` (严格模式下)。
    *   **参数校验**：函数调用参数数量是否匹配？字面量类型是否正确？
    *   **权限控制**：禁止访问未定义的全局变量（JexPath 的严格 `$` 根节点限制）。
*   *JexPath 实践*：[semantic.ts](src/validator/semantic.ts) 中的 `ensureLiteralType`。

### 3.4 第四步：运行时执行 (Runtime Execution)
*   **任务**：遍历 AST 并产生结果。
*   **策略**：
    *   **解释执行**：即时遍历 AST 节点进行计算（Jexl 引擎）。
    *   **混合模式 (Hybrid)**：
        *   **预处理**：识别 AST 中的 `JSONPathNode`。
        *   **查询优化**：使用 `jsonpath-plus` 高效提取数据。
        *   **逻辑计算**：将提取的数据注入上下文，进行最终运算。

## 4. 进阶话题 (Advanced Topics)
*   **错误处理 (Error Handling)**：
    *   如何提供友好的报错信息（精确到行、列、高亮错误位置）？
*   **安全性 (Security)**：
    *   沙箱隔离：避免访问 `window` / `global` / `process`。
    *   原型链污染防护。
*   **性能优化 (Performance)**：
    *   AST 缓存 (LRU Cache)。
    *   常量折叠 (Constant Folding)。

## 5. 实战演示 (Demo)
*   展示 JexPath 的 Examples 页面。
*   现场编写一个简单的解析规则：
    *   输入：`$.users[?(@.age > 18)].name`
    *   输出：解析流程的可视化。

## 6. 总结与 Q&A
*   回顾：Lexer -> Parser -> AST -> Semantic -> Runtime。
*   推荐阅读：《编译原理》(龙书)、《Crafting Interpreters》。

---
*Created by JexPath Team*
