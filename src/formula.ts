/**
 * 注册内置和自定义公式（函数/转换）
 */
import dayjs from "dayjs";
import { Jexl } from "jexl";

function size(val: any[] | string) {
  if (Array.isArray(val) || typeof val === "string") {
    return val.length;
  }
  return 0;
}

function replace(str: string, search: string, replace: string) {
  if (typeof str === "string") {
    return str.replace(search, replace);
  }
  return str;
}

function trim(str: string) {
  if (typeof str === "string") {
    return str.trim();
  }
  return str;
}

function date(val: string, format: string) {
  return dayjs(val).format(format);
}

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
  DATE: date,
  PARSE_JSON: parseJson,
};

export default function registerFormulas(
  jexl: Jexl,
  options?: {
    customFunctions?: Record<string, (...args: any[]) => any>;
    customTransforms?: Record<string, (a: any, b: any) => any>;
  },
) {
  // 内置函数
  Object.keys(innerFormulas).forEach((key) => {
    jexl.addFunction(key, innerFormulas[key]);
  });

  // 自定义函数
  if (options?.customFunctions) {
    Object.keys(options.customFunctions).forEach((key) => {
      jexl.addFunction(key, options.customFunctions[key]);
    });
  }

  // 自定义转换
  if (options?.customTransforms) {
    Object.keys(options.customTransforms).forEach((key) => {
      jexl.addTransform(key, options.customTransforms[key]);
    });
  }

  // 内置转换
  // jexl.addTransform("replace", replace);
  // jexl.addTransform("size", size);
  // jexl.addTransform("length", size); // Alias for size
  // jexl.addTransform("trim", trim);
}
