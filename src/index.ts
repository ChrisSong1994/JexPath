/**
 * JexPath 类
 * 用于解析和执行Jexl和JSONPath表达式
 * 可以自定义扩展公式类型
 */

import Jexl from "jexl";
import expressionParser from "./parser";
import registerFormulas from "./formula";

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
   * 执行表达式
   * @param expression 表达式对象
   * @param context 执行上下文 (可选，合并默认 context)
   * @returns 表达式执行结果
   */
  async run(expression: string, context: Record<string, any> = {}) {
    const finalContext = {
      $: this.contextData,
      ...this.contextData,
      ...context,
    };

    // Ensure $ points to the correct context root
    if (context && context.$) {
      // keep context.$ pointing to the original context
      finalContext.$ = context.$;
    } else if (!finalContext.$) {
      finalContext.$ = finalContext;
    }

    const parsedExpression = expressionParser(expression, finalContext);
    return await this.engine.eval(parsedExpression, finalContext);
  }
}
