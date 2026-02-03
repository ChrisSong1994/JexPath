# JexPath

这是一个基于Jexl 和 JSONPath 的表达式解析器

## 功能

- 解析和执行Jexl表达式
- 解析和执行JSONPath表达式
- 支持变量和函数调用
- 支持隐式类型转换
- 支持字符串替换
- 支持解析 JSON 字符串

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