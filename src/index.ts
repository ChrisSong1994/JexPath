/**
 * JexPath 类
 * 用于解析和执行Jexl和JSONPath表达式
 * 可以自定义扩展公式类型
 */

import Jexl from "jexl";
import expressionParser from "./parser";
import registerFormulas from "./formula";
import { validateSyntax } from "./validator/index.js";

export { validateSyntax } from "./validator/index.js";

export default class JexPath {
  private contextData: any;
  private engine: any;

  constructor(
    contextData: any,
    options?: {
      customFunctions?: Record<string, (...args: any[]) => any>;
      customTransforms?: Record<string, (a: any, b: any) => any>;
    },
  ) {
    this.contextData = contextData;
    this.engine = new Jexl.Jexl();
    registerFormulas(this.engine, options);
  }


  /**
   * 验证表达式语法
   * @param expression 表达式字符串
   * @returns 是否语法有效
   */
  validate(expression: string): boolean {
    try {
      validateSyntax(expression);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 执行表达式
   * @param expression 表达式对象
   * @param context 执行上下文 (可选，合并默认 context)
   * @returns 表达式执行结果
   */
  async run(expression: string, context: Record<string, any> = {}) {
    // 强制执行严格的语法验证
    validateSyntax(expression);

    const finalContext = {
      $: this.contextData,
      ...this.contextData,
      ...context,
    };

    // 确保 $ 指向正确的上下文根
    if (context && context.$) {
      // 保持 context.$ 指向原始上下文
      finalContext.$ = context.$;
    } else if (!finalContext.$) {
      finalContext.$ = finalContext;
    }

    const parsedExpression = expressionParser(expression, finalContext);
    return await this.engine.eval(parsedExpression, finalContext);
  }
}
