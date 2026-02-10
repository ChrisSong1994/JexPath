import {
  Node,
  CallExpression,
  BinaryExpression,
  LogicalExpression,
  ConditionalExpression,
  UnaryExpression,
  MemberExpression,
  SyntaxError,
  Literal,
  JSONPathNode,
} from "./types.js";
import { JSONPath } from "jsonpath-plus";

export class SemanticAnalyzer {
  analyze(node: Node): void {
    switch (node.type) {
      case "JSONPath":
        this.checkJSONPath(node as JSONPathNode);
        break;
      case "CallExpression":
        this.checkCallExpression(node as CallExpression);
        break;
      case "BinaryExpression":
        this.checkBinaryExpression(node as BinaryExpression);
        break;
      case "LogicalExpression":
        this.checkLogicalExpression(node as LogicalExpression);
        break;
      case "ConditionalExpression":
        this.checkConditionalExpression(node as ConditionalExpression);
        break;
      case "UnaryExpression":
        this.checkUnaryExpression(node as UnaryExpression);
        break;
      case "MemberExpression":
        this.checkMemberExpression(node as MemberExpression);
        break;
      // Literal and Identifier are always valid in isolation
    }
  }

  private checkJSONPath(node: JSONPathNode) {
    try {
      JSONPath.toPathArray(node.value);
    } catch (e) {
      throw new SyntaxError(
        `Invalid JSONPath: ${e.message}`,
        node.start,
        0
      );
    }
  }

  private checkCallExpression(node: CallExpression) {
    const name = node.callee.name;
    const args = node.arguments;

    // 递归检查参数
    args.forEach((arg) => this.analyze(arg));

    switch (name) {
      case "SIZE":
        if (args.length !== 1) {
          throw new SyntaxError(
            `Function 'SIZE' expects 1 argument, got ${args.length}`,
            node.start, // Approximate location
            0
          );
        }
        // 参数可以是字符串或数组（变量）。
        // 由于不支持数组字面量，如果是字面量，必须是字符串。
        this.ensureLiteralType(args[0], ["String"], "SIZE argument");
        break;

      case "REPLACE":
        if (args.length !== 3) {
          throw new SyntaxError(
            `Function 'REPLACE' expects 3 arguments, got ${args.length}`,
            node.start,
            0
          );
        }
        this.ensureLiteralType(args[0], ["String"], "REPLACE first argument");
        this.ensureLiteralType(args[1], ["String"], "REPLACE second argument");
        this.ensureLiteralType(args[2], ["String"], "REPLACE third argument");
        break;

      case "TRIM":
        if (args.length !== 1) {
          throw new SyntaxError(
            `Function 'TRIM' expects 1 argument, got ${args.length}`,
            node.start,
            0
          );
        }
        this.ensureLiteralType(args[0], ["String"], "TRIM argument");
        break;

      case "DATE":
        if (args.length > 2) {
          throw new SyntaxError(
            `Function 'DATE' expects 0, 1 or 2 arguments, got ${args.length}`,
            node.start,
            0
          );
        }
        if (args.length >= 1) {
            this.ensureLiteralType(args[0], ["String", "Integer"], "DATE first argument");
        }
        if (args.length === 2) {
            this.ensureLiteralType(args[1], ["String"], "DATE second argument");
        }
        break;

      case "PARSE_JSON":
        if (args.length !== 1) {
          throw new SyntaxError(
            `Function 'PARSE_JSON' expects 1 argument, got ${args.length}`,
            node.start,
            0
          );
        }
        this.ensureLiteralType(args[0], ["String"], "PARSE_JSON argument");
        break;
    }
  }

  private checkBinaryExpression(node: BinaryExpression) {
    this.analyze(node.left);
    this.analyze(node.right);

    const op = node.operator;

    // 算术运算
    if (["+", "-", "*", "/", "%", "**"].includes(op)) {
      if (op === "+") {
          // 允许字符串拼接
          // 检查是否都是数字 或者 都是字符串？
          // Jexl 允许 '1' + 2 -> '12'.
          // 我们允许 [Integer, Float, String] 用于 +
          this.ensureLiteralType(node.left, ["Integer", "Float", "String"], `Operator '${op}' left operand`);
          this.ensureLiteralType(node.right, ["Integer", "Float", "String"], `Operator '${op}' right operand`);
      } else {
          this.ensureLiteralType(node.left, ["Integer", "Float"], `Operator '${op}' left operand`);
          this.ensureLiteralType(node.right, ["Integer", "Float"], `Operator '${op}' right operand`);
      }
    }
    // 比较运算 (关系)
    else if ([">", "<", ">=", "<="].includes(op)) {
      // 必须都是数字或都是字符串。
      // 如果一个是变量，我们检查另一个。
      const leftType = this.getLiteralType(node.left);
      const rightType = this.getLiteralType(node.right);

      if (leftType && rightType) {
        // 都是字面量
        const leftIsNum = leftType === "Integer" || leftType === "Float";
        const rightIsNum = rightType === "Integer" || rightType === "Float";
        const leftIsStr = leftType === "String";
        const rightIsStr = rightType === "String";

        if (leftIsNum && rightIsNum) return; // OK
        if (leftIsStr && rightIsStr) return; // OK

        throw new SyntaxError(
          `Operator '${op}' requires operands of compatible types (Number or String)`,
          node.start,
          0
        );
      } else if (leftType) {
        // 左边是字面量，右边是变量
        if (leftType === "Boolean") {
           throw new SyntaxError(
            `Operator '${op}' cannot be applied to Boolean`,
            node.left.start,
            0
          );
        }
      } else if (rightType) {
        // 右边是字面量
        if (rightType === "Boolean") {
           throw new SyntaxError(
            `Operator '${op}' cannot be applied to Boolean`,
            node.right.start,
            0
          );
        }
      }
    }
    // 相等运算 (==, !=) - 兼容任何类型？
    // 用户说："二元运算符左右类型兼容 (num-num, str-str, bool-bool)".
    // 这意味着我们不应该比较 Num == Str.
    else if (["==", "!="].includes(op)) {
       const leftType = this.getLiteralType(node.left);
       const rightType = this.getLiteralType(node.right);

       if (leftType && rightType) {
         const leftGroup = this.getTypeGroup(leftType);
         const rightGroup = this.getTypeGroup(rightType);
         
         if (leftGroup !== rightGroup) {
            throw new SyntaxError(
              `Operator '${op}' requires operands of compatible types`,
              node.start,
              0
            );
         }
       }
    }
  }

  private checkLogicalExpression(node: LogicalExpression) {
    this.analyze(node.left);
    this.analyze(node.right);

    // &&, || 期望布尔值
    this.ensureLiteralType(node.left, ["Boolean"], `Operator '${node.operator}' left operand`);
    this.ensureLiteralType(node.right, ["Boolean"], `Operator '${node.operator}' right operand`);
  }

  private checkConditionalExpression(node: ConditionalExpression) {
    this.analyze(node.test);
    this.analyze(node.consequent);
    this.analyze(node.alternate);

    // 测试条件必须是布尔值
    this.ensureLiteralType(node.test, ["Boolean"], "Conditional test");
  }

  private checkUnaryExpression(node: UnaryExpression) {
    this.analyze(node.argument);

    if (node.operator === "!") {
      this.ensureLiteralType(node.argument, ["Boolean"], "Operator '!' operand");
    }
  }

  private checkMemberExpression(node: MemberExpression) {
      this.analyze(node.object);
  }

  private ensureLiteralType(node: Node, allowedTypes: string[], context: string) {
    if (node.type !== "Literal") return; // 如果不是字面量则跳过（假设变量是正确的）

    const literal = node as Literal;
    // 从值确定类型
    let type = "";
    if (typeof literal.value === "number") {
       // 是 Float 还是 Integer？Lexer 区分了，但这里只有值。
       // 实际上 Lexer 设置 Token 类型。Parser 设置 Literal 值。
       // 我的 Literal 接口没有存储子类型 (Integer/Float)。
       // 但我可以从值推断，或者直接视为 Number。
       // 我的 `allowedTypes` 使用 "Integer", "Float"。
       // 我应该统一为 "Number"。
       // 但下面的 `getLiteralType` 会尝试返回具体的。
       type = Number.isInteger(literal.value) ? "Integer" : "Float";
    } else if (typeof literal.value === "string") {
      type = "String";
    } else if (typeof literal.value === "boolean") {
      type = "Boolean";
    }

    // 基于组检查匹配
    const allowedGroups = allowedTypes.map(t => this.getTypeGroup(t));
    const actualGroup = this.getTypeGroup(type);
    
    if (!allowedGroups.includes(actualGroup)) {
      throw new SyntaxError(
        `${context} must be one of [${allowedTypes.join(", ")}], got ${type}`,
        node.start,
        0
      );
    }
  }

  private getLiteralType(node: Node): string | null {
    if (node.type !== "Literal") return null;
    const val = (node as Literal).value;
    if (typeof val === "number") return Number.isInteger(val) ? "Integer" : "Float";
    if (typeof val === "string") return "String";
    if (typeof val === "boolean") return "Boolean";
    return null;
  }

  private getTypeGroup(type: string): string {
    if (type === "Integer" || type === "Float") return "Number";
    return type;
  }
}
