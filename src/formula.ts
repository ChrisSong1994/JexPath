/**
 * 定义表达式
 */
import { JSONPath } from "jsonpath-plus";
import { Jexl } from "jexl";

// 扩展： string 转换成数字
function toNumber(str: string, float: boolean = false) {
  if (typeof str === "string") {
    return float ? parseFloat(str) : Number(str);
  }
  return str;
}

// 扩展：支持字符串替换
function replace(str: string, search: string, replace: string) {
  if (typeof str === "string") {
    return str.replace(search, replace);
  }
  return str;
}

// 扩展：支持解析 JSON 字符串
function parseJson(str: string) {
  if (typeof str === "string") {
    try {
      return JSON.parse(str);
    } catch (e) {
      return str;
    }
  }
  return str;
}

const innerFormulas = {
  toNumber,
  replace,
  parseJson,
};

export default function registerFormulas(jexl: Jexl, contextData: any) {
  // 注册内部函数
  Object.keys(innerFormulas).forEach((key) => {
    jexl.addFunction(key, innerFormulas[key]);
  });

  // 注册 jp 函数
  jexl.addFunction("jp", (path: string) => {
    const res = JSONPath({
      path: path,
      json: contextData,
      wrap: false,
    });
    // 如果结果是数组且只有一个元素，解包（Jexl通常处理单值更方便）
    if (Array.isArray(res) && res.length === 1) {
      return res[0];
    }
    return res;
  });

  // 注册 jp 变换器
  jexl.addTransform("jp", (path: string) => {
    const res = JSONPath({
      path: path,
      json: contextData,
      wrap: false,
    });
    if (Array.isArray(res) && res.length === 1) {
      return res[0];
    }
    return res;
  });
}
