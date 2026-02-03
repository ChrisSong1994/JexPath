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
  private engine: any; // Jexl instance type

  constructor(contextData: any) {
    this.contextData = contextData;
    this.engine = new Jexl.Jexl();
    // 注入 $ 变量指向 contextData 自身，以便支持 $.prop 语法
    // 注意：这修改了 contextData 的引用，如果 contextData 是只读的可能会有问题
    // 但通常这是安全的。或者我们在 execute 时创建一个新的 context 对象。
    // 为了支持 constructor 传入的 contextData 直接包含 $，我们在这里处理
    // 但是 Jexl 是在 eval 时传入 context 的。
    // 所以这里的 contextData 只是暂存。
    
    // 初始化注册公式
    registerFormulas(this.engine, this.contextData);
  }

  /**
   * 执行表达式
   * @param expression 表达式对象
   * @param context 执行上下文 (可选，覆盖默认 context)
   * @returns 表达式执行结果
   */
  async run(expression: string, context: Record<string, any> = {}) {
    // 合并 context，优先级：传入的 context > 构造函数 context
    // 确保 $ 存在
    const finalContext = {
        $: this.contextData, // 默认 $ 指向构造函数传入的数据
        ...this.contextData,
        ...context
    };
    
    // 如果传入的 context 覆盖了 $，则使用新的 $
    if (context && context.$) {
        // keep context.$
    } else if (!finalContext.$) {
        finalContext.$ = finalContext;
    }

    // 重新注册公式，因为 contextData 可能变了？
    // registerFormulas 闭包了 constructor 中的 contextData。
    // 如果 run 时传入了新的 context，jp() 函数可能使用的是旧的 contextData。
    // 这是个设计问题。
    // 如果 jp() 需要使用运行时的 context，我们需要在 eval 时通过 context 传递，
    // 或者每次 run 都重新注册函数？重新注册函数开销较大。
    // 但 Jexl 的 transform/function 通常是无状态的或者绑定到 engine 的。
    // 我们的 jp 实现闭包了 contextData。
    // 如果用户希望 jp() 查询的是当前 eval 的 context，那么我们需要想办法获取。
    // 但 Jexl function 不接收 context 作为参数。
    // 权衡：假设 constructor 传入的数据是主要数据源。
    // 如果需要动态数据，建议每次 new JexPath(data)。
    
    const parsedExpression = expressionParser(expression, finalContext);
    return await this.engine.eval(parsedExpression, finalContext);
  }
}
