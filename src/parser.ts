/**
 * 解析表达式
 * @param expression 表达式字符串
 * @param contextData 执行上下文数据
 * @returns 解析后的表达式对象
 */

export default function expressionParser(expression: string, contextData: any): string {
  // 核心逻辑：
  // 将形如 '$.path.to.value' 的字符串字面量（必须包含 $）转换为 jp('$.path.to.value')
  // 这样 Jexl 就会调用我们注册的 jp 函数来解析 JSONPath
  
  // 匹配单引号或双引号包裹的字符串，且字符串内容以 $ 开头
  // regex explanation:
  // (['"])  -> capture group 1: starting quote (' or ")
  // (\$.*?) -> capture group 2: starts with $, non-greedy match until...
  // \1      -> matching ending quote (same as group 1)
  const regex = /(['"])(\$.*?)\1/g;
  
  // 替换为 jp('match')
  // 注意：我们需要保留原来的引号或者统一使用单引号/双引号
  // 这里我们选择保留原来的引号内容，并包裹在 jp() 中
  // 假设 expression 是 "'$.foo'" -> "jp('$.foo')"
  
  const parsed = expression.replace(regex, (match, quote, content) => {
    // match is "'$.foo'"
    // quote is "'"
    // content is "$.foo"
    return `jp(${quote}${content}${quote})`;
  });

  return parsed;
}
