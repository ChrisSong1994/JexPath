
import { JSONPath } from "jsonpath-plus";

/**
 * 解析表达式
 * @param expression 表达式字符串
 * @param contextData 执行上下文数据
 * @returns 解析后的表达式对象
 */

export default function expressionParser(expression: string, contextData: any): string {
  // 逻辑:
  // 1. 识别 JSONPath 字符串（包括带引号和不带引号的）
  // 2. 使用 jsonpath-plus 解析它们
  // 3. 将结果存储在临时上下文变量中
  // 4. 用变量名替换表达式中的 JSONPath 字符串

  let result = "";
  let pos = 0;
  let matchIndex = 0;
  let regexMatchIndex = 0;
  const len = expression.length;

  // 替换 JSONPath 并更新上下文的辅助函数
  const replacePath = (path: string) => {
    // 如果可用，使用 contextData.$ 避免上下文扩展带来的重复
    const jsonTarget = contextData.$ !== undefined ? contextData.$ : contextData;
    
    // 计算 JSONPath
    let res;
    try {
        res = JSONPath({
            path: path,
            json: jsonTarget,
            wrap: false
        });
    } catch (e) {
        // 如果计算失败（例如路径无效），返回 undefined 或让 Jexl 失败？
        // 最好返回 undefined 或保持原样。
        // 但目前我们假设如果我们的解析器提取了它，它就是一个有效的路径。
        // 但是，如果严格验证通过，应该没问题。
        console.warn(`JSONPath evaluation failed for '${path}': ${e.message}`);
        res = undefined;
    }
    
    // 解包单元素数组
    let finalRes = res;
    if (Array.isArray(res) && res.length === 1) {
      finalRes = res[0];
    }
    
    // 注入上下文
    const tempVarName = `__jp_${matchIndex++}`;
    contextData[tempVarName] = finalRes;
    
    return tempVarName;
  };

  const replaceRegex = (regexStr: string) => {
    try {
      const lastSlash = regexStr.lastIndexOf("/");
      const pattern = regexStr.slice(1, lastSlash);
      const flags = regexStr.slice(lastSlash + 1);
      const regexObj = new RegExp(pattern, flags);

      const tempVarName = `__regex_${regexMatchIndex++}`;
      contextData[tempVarName] = regexObj;
      return tempVarName;
    } catch (e) {
      console.warn(`Invalid regex '${regexStr}': ${e.message}`);
      return regexStr; // fallback
    }
  };

  const OPERATORS = new Set([
    "+", "-", "*", "/", "%", "**", "==", "!=", ">", "<", ">=", "<=", "&&", "||", "!", "?", ":",
  ]);
  const PUNCTUATION = new Set(["(", ")", ","]);

  while (pos < len) {
    const char = expression[pos];

    // 处理字符串（双引号或单引号）
    if (char === '"' || char === "'") {
      const start = pos;
      const quote = char;
      pos++; // 跳过引号
      let content = "";
      while (pos < len) {
        const c = expression[pos];
        if (c === quote) {
          pos++; // 跳过闭合引号
          break;
        }
        if (c === '\\' && pos + 1 < len && expression[pos+1] === quote) {
          content += quote;
          pos += 2;
          continue;
        }
        content += c;
        pos++;
      }
      
      // 检查内容是否像 JSONPath（以 $ 开头并且包含 . 或 [）
      // 保持对带引号的 JSONPaths 的向后兼容性
      if (content.startsWith("$.") || content.startsWith("$[")) {
          result += replacePath(content);
      } else {
          // 保留原始字符串（包括引号）
          result += expression.slice(start, pos);
      }
      continue;
    }

    // 处理正则表达式
    if (char === "/") {
      let i = pos - 1;
      while (i >= 0 && /\s/.test(expression[i])) {
        i--;
      }

      let isRegex = false;
      if (i < 0) {
        isRegex = true;
      } else {
        const lastChar = expression[i];
        if (OPERATORS.has(lastChar) || PUNCTUATION.has(lastChar)) {
          if (lastChar !== ")" && lastChar !== "]") {
            isRegex = true;
          }
        } else if (["(", ",", "!", ":"].includes(lastChar)) {
          isRegex = true;
        } else {
          // 检查关键字 (如 in)
          if (/[a-zA-Z0-9_$]/.test(lastChar)) {
            let j = i;
            while (j >= 0 && /[a-zA-Z0-9_$]/.test(expression[j])) {
              j--;
            }
            const word = expression.slice(j + 1, i + 1);
            if (["in", "return", "typeof", "yield"].includes(word)) {
              isRegex = true;
            }
          }
        }
      }

      if (isRegex) {
        let tempPos = pos + 1; // skip /
        let inClass = false;
        let escaped = false;
        let found = false;

        while (tempPos < len) {
          const c = expression[tempPos];
          if (escaped) {
            escaped = false;
            tempPos++;
            continue;
          }
          if (c === "\\") {
            escaped = true;
            tempPos++;
            continue;
          }
          if (inClass) {
            if (c === "]") inClass = false;
            tempPos++;
            continue;
          }
          if (c === "[") {
            inClass = true;
            tempPos++;
            continue;
          }
          if (c === "/") {
            tempPos++; // skip /
            // flags
            while (tempPos < len && /[a-z]/.test(expression[tempPos])) {
              tempPos++;
            }
            found = true;
            break;
          }
          tempPos++;
        }

        if (found) {
          const regexStr = expression.slice(pos, tempPos);
          result += replaceRegex(regexStr);
          pos = tempPos;
          continue;
        }
      }
    }

    // 处理未加引号的 JSONPath
    if (char === '$') {
       const next = pos + 1 < len ? expression[pos+1] : '';
       if (next === '.' || next === '[') {
           // 消费 JSONPath
           const start = pos;
           let depth = 0;
           let buffer = "$";
           pos++; // 消费了 $

           while (pos < len) {
               const c = expression[pos];
               
               // 处理 JSONPath 内部的字符串（例如 ['foo']）
               if (c === '"' || c === "'") {
                   const quote = c;
                   buffer += c;
                   pos++;
                   while (pos < len) {
                       const sc = expression[pos];
                       buffer += sc;
                       pos++;
                       if (sc === quote) break;
                       if (sc === '\\' && pos < len) {
                           buffer += expression[pos];
                           pos++;
                       }
                   }
                   continue;
               }
               
               if (c === '[' || c === '(') depth++;
               if (c === ']' || c === ')') depth--;
               
               if (depth < 0) {
                   depth++; // 恢复
                   break;
               }
               
               if (depth === 0) {
                   if (/\s/.test(c)) break;
                   if (PUNCTUATION.has(c)) break;
                   if (OPERATORS.has(c)) {
                       const lastBufferChar = buffer[buffer.length - 1];
                       if (c === "*" && (lastBufferChar === "." || lastBufferChar === "[")) {
                           // 允许
                       } else {
                           break;
                       }
                   }
               }
               
               buffer += c;
               pos++;
           }
           
           result += replacePath(buffer);
           continue;
       }
    }
    
    // 仅追加字符
    result += char;
    pos++;
  }
  
  return result;
}
