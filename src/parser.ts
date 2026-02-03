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
  
  // 匹配单引号或双引号包裹的字符串，且字符串内容以 $ 开头，并且紧接着 . 或 [
  // 这样避免匹配到普通的 "$" 字符串（如 replace('$', '')）
  // regex explanation:
  // (['"])      -> capture group 1: starting quote
  // (\$[.\[].*?) -> capture group 2: starts with $ followed by . or [, non-greedy
  // \1          -> matching ending quote
  const regex = /(['"])(\$[.\[].*?)\1/g;
  
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

  // 支持 .replace() 语法转换为管道语法 | replace()
  // 简单处理：将 .replace( 替换为 | replace(
  const finalExpression = parsed.replace(/\.replace\(/g, ' | replace(');

  return finalExpression;
}
