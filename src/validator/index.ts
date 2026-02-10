import { Parser } from "./parser.js";
import { SemanticAnalyzer } from "./semantic.js";

export function validateSyntax(expr: string): void {
  const parser = new Parser(expr);
  const ast = parser.parse();
  const analyzer = new SemanticAnalyzer();
  analyzer.analyze(ast);
}

export * from "./types.js";
export * from "./lexer.js";
export * from "./parser.js";
export * from "./semantic.js";
