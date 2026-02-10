/**
 * 注册内置和自定义公式（函数/转换）
 */
import dayjs from "dayjs";
import { Jexl } from "jexl";

/**
 * 计算数组或字符串的长度
 * @param val 数组或字符串
 * @returns 长度
 */
function size(val: any[] | string) {
  if (Array.isArray(val) || typeof val === "string") {
    return val.length;
  }
  return 0;
}

/**
 * 替换字符串中的子字符串
 * @param str 原始字符串
 * @param search 要搜索的子字符串
 * @param replace 替换的子字符串
 * @returns 替换后的字符串
 */
function replace(str: string, search: string, replace: string) {
  if (typeof str === "string") {
    return str.replace(search, replace);
  }
  return str;
}

/**
 * 去字符串首尾空格
 * @param str 原始字符串
 * @returns 去空格后的字符串
 */
function trim(str: string) {
  if (typeof str === "string") {
    return str.trim();
  }
  return str;
}

/**
 * 格式化日期字符串
 * @param val 日期字符串或时间戳
 * @param format 日期格式
 * @returns 格式化后的日期字符串
 */
function date(val: string, format: string) {
  return dayjs(val).format(format);
}

/**
 * 解析 JSON 字符串
 * @param str JSON 字符串
 * @returns 解析后的对象或原始字符串
 */
function parseJson(str: string) {
  if (typeof str === "string") {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }
  return str;
}

// 内置公式（函数/转换）
const innerFormulas = {
  SIZE: size,
  REPLACE: replace,
  TRIM: trim,
  DATE: date,
  PARSE_JSON: parseJson,
};

/**
 * 注册内置和自定义公式（函数/转换）
 * @param jexl Jexl 实例
 * @param options 自定义函数和转换
 */
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
}
