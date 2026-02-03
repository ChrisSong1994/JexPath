/**
 * 定义表达式
 */
import { JSONPath } from "jsonpath-plus";
import { Jexl } from "jexl";

// 扩展：计算值的 size
function size(val: any[] | string) {
  if (Array.isArray(val)) {
    return val.length;
  }
  if (typeof val === "string") {
    return val.length;
  }
  return 0;
}

// 扩展：支持字符串替换
function replace(str: string, search: string, replace: string) {
  if (typeof str === "string") {
    return str.replace(search, replace);
  }
  return str;
}

// 扩展： 支持 trim 函数
function trim(str: string) {
  if (typeof str === "string") {
    return str.trim();
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
  SIZE: size,
  REPLACE: replace,
  TRIM: trim,
  PARSE_JSON: parseJson,
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

  // 注册 replace 变换器
  jexl.addTransform("replace", replace);

  // 注册 length 变换器
  jexl.addTransform("length", (val: any) => {
    if (Array.isArray(val) || typeof val === "string") {
      return val.length;
    }
    return 0;
  });
}
