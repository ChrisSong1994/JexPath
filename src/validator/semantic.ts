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

    // Check arguments recursively
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
        // Argument can be String or Array (Variable).
        // Since Array Literal is not supported, if Literal, must be String.
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

    // Arithmetic
    if (["+", "-", "*", "/", "%", "**"].includes(op)) {
      if (op === "+") {
          // Allow String concatenation
          // Check if both are numbers OR both are strings?
          // Jexl allows '1' + 2 -> '12'.
          // We can allow [Integer, Float, String] for +
          this.ensureLiteralType(node.left, ["Integer", "Float", "String"], `Operator '${op}' left operand`);
          this.ensureLiteralType(node.right, ["Integer", "Float", "String"], `Operator '${op}' right operand`);
      } else {
          this.ensureLiteralType(node.left, ["Integer", "Float"], `Operator '${op}' left operand`);
          this.ensureLiteralType(node.right, ["Integer", "Float"], `Operator '${op}' right operand`);
      }
    }
    // Comparison (Relational)
    else if ([">", "<", ">=", "<="].includes(op)) {
      // Must be both numbers or both strings.
      // If one is variable, we check the other.
      const leftType = this.getLiteralType(node.left);
      const rightType = this.getLiteralType(node.right);

      if (leftType && rightType) {
        // Both literals
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
        // Left is literal, Right is variable
        if (leftType === "Boolean") {
           throw new SyntaxError(
            `Operator '${op}' cannot be applied to Boolean`,
            node.left.start,
            0
          );
        }
      } else if (rightType) {
        // Right is literal
        if (rightType === "Boolean") {
           throw new SyntaxError(
            `Operator '${op}' cannot be applied to Boolean`,
            node.right.start,
            0
          );
        }
      }
    }
    // Equality (==, !=) - compatible with anything?
    // User said: "Binary operators left/right type compatible (num-num, str-str, bool-bool)".
    // This implies we shouldn't compare Num == Str.
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

    // &&, || expect Boolean
    this.ensureLiteralType(node.left, ["Boolean"], `Operator '${node.operator}' left operand`);
    this.ensureLiteralType(node.right, ["Boolean"], `Operator '${node.operator}' right operand`);
  }

  private checkConditionalExpression(node: ConditionalExpression) {
    this.analyze(node.test);
    this.analyze(node.consequent);
    this.analyze(node.alternate);

    // Test must be Boolean
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
    if (node.type !== "Literal") return; // Skip if not literal (assume variable is correct)

    const literal = node as Literal;
    // Determine type from value
    let type = "";
    if (typeof literal.value === "number") {
       // Is it Float or Integer? Lexer distinguishes, but here we have value.
       // Actually Lexer sets Token type. Parser sets Literal value.
       // My Literal interface doesn't store sub-type (Integer/Float).
       // But I can infer from value or just treat as Number.
       // My `allowedTypes` uses "Integer", "Float".
       // I should probably unify to "Number".
       // But my `getLiteralType` below will try to return specific.
       type = Number.isInteger(literal.value) ? "Integer" : "Float";
    } else if (typeof literal.value === "string") {
      type = "String";
    } else if (typeof literal.value === "boolean") {
      type = "Boolean";
    }

    // Check match based on groups
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
