
import { describe, it, expect } from "vitest";
import { Lexer } from "../src/validator/lexer";
import { TokenType } from "../src/validator/types";
import JexPath from "../src/index";

describe("Lexer Regex Support", () => {
  it("should tokenize regex literal", () => {
    const input = "REPLACE($.store.name, /\\s+/, '_')";
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();
    
    // REPLACE
    expect(tokens[0].type).toBe(TokenType.Identifier);
    expect(tokens[0].value).toBe("REPLACE");
    
    // (
    expect(tokens[1].type).toBe(TokenType.Punctuation);
    
    // $.store.name
    expect(tokens[2].type).toBe(TokenType.JSONPath);
    
    // ,
    expect(tokens[3].type).toBe(TokenType.Punctuation);
    
    // /\\s+/
    expect(tokens[4].type).toBe(TokenType.Regex); 
    expect(tokens[4].value).toBe("/\\s+/");
    
    // ,
    expect(tokens[5].type).toBe(TokenType.Punctuation);
    
    // '_'
    expect(tokens[6].type).toBe(TokenType.String);
    
    // )
    expect(tokens[7].type).toBe(TokenType.Punctuation);
  });
});

describe("JexPath Regex Execution", () => {
  it("should evaluate regex literal in REPLACE function", async () => {
    const context = {
      store: {
        name: "Tech & Read Store"
      }
    };
    
    const jexpath = new JexPath(context);
    
    const expression = "REPLACE($.store.name, /\\s+/, '_')";
    const result = await jexpath.run(expression);
    
    // replace only first occurrence without global flag
    expect(result).toBe("Tech_& Read Store");
    
    const expressionGlobal = "REPLACE($.store.name, /\\s+/g, '_')";
    const resultGlobal = await jexpath.run(expressionGlobal);
    expect(resultGlobal).toBe("Tech_&_Read_Store");
  });
  
  it("should handle regex with complex characters", async () => {
    const context = {
      text: "abc/def"
    };
    const jexpath = new JexPath(context);
    
    // Replace / with -
    // Regex should be /\//
    const expression = "REPLACE($.text, /\\//, '-')";
    const result = await jexpath.run(expression);
    expect(result).toBe("abc-def");
  });
});
