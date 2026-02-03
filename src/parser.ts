import { JSONPath } from "jsonpath-plus";

/**
 * 解析表达式
 * @param expression 表达式字符串
 * @param contextData 执行上下文数据
 * @returns 解析后的表达式对象
 */

export default function expressionParser(expression: string, contextData: any): string {
  // Logic:
  // 1. Identify JSONPath strings (e.g. '$.store.book')
  // 2. Resolve them using jsonpath-plus
  // 3. Store results in temporary context variables
  // 4. Replace JSONPath strings in expression with variable names
  
  // Match quoted strings starting with $ followed by . or [
  const regex = /(['"])(\$[.\[].*?)\1/g;
  
  let matchIndex = 0;

  const parsed = expression.replace(regex, (match, quote, content) => {
    // content is the JSONPath string (e.g. "$.foo")
    
    // Use contextData.$ if available to avoid duplicates from context spreading
    const jsonTarget = contextData.$ !== undefined ? contextData.$ : contextData;
    
    const res = JSONPath({
      path: content,
      json: jsonTarget,
      wrap: false
    });
    
    // Unwrap single element array
    let finalRes = res;
    if (Array.isArray(res) && res.length === 1) {
      finalRes = res[0];
    }
    
    // Inject into context
    const tempVarName = `__jp_${matchIndex++}`;
    contextData[tempVarName] = finalRes;
    
    return tempVarName;
  });

  // Support .replace() syntax -> | replace()
  const finalExpression = parsed.replace(/\.replace\(/g, ' | replace(');

  return finalExpression;
}
