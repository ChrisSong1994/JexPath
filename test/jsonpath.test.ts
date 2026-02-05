import { describe, it, expect } from "vitest";
import JexPath from "../src/index";

describe("JSONPath Complex Usage", () => {
  const storeData = {
    store: {
      book: [
        {
          category: "reference",
          author: "Nigel Rees",
          title: "Sayings of the Century",
          price: 8.95,
          tags: ["history", "quotes"]
        },
        {
          category: "fiction",
          author: "Evelyn Waugh",
          title: "Sword of Honour",
          price: 12.99,
          tags: ["fiction", "war"]
        },
        {
          category: "fiction",
          author: "Herman Melville",
          title: "Moby Dick",
          isbn: "0-553-21311-3",
          price: 8.99,
          tags: ["classic", "sea"]
        },
        {
          category: "fiction",
          author: "J. R. R. Tolkien",
          title: "The Lord of the Rings",
          isbn: "0-395-19395-8",
          price: 22.99,
          tags: ["fantasy", "adventure"]
        }
      ],
      bicycle: {
        color: "red",
        price: 19.95,
        extras: ["basket", "bell"]
      },
      metadata: {
        "key with spaces": "value1",
        "key.with.dots": "value2"
      }
    },
    expensive: 10,
  };

  const engine = new JexPath(storeData);

  it("Basic Access: Dot and Bracket notation", async () => {
    // Basic dot notation
    expect(await engine.run("$.store.bicycle.color")).toBe("red");
    
    // Bracket notation for property
    expect(await engine.run("$['store']['bicycle']['price']")).toBe(19.95);
    
    // Mixed notation
    expect(await engine.run("$.store['bicycle'].price")).toBe(19.95);
  });

  it("Special Keys: Spaces and Dots", async () => {
    // Keys with spaces
    expect(await engine.run("$['store']['metadata']['key with spaces']")).toBe("value1");
    
    // Keys with dots
    expect(await engine.run("$['store']['metadata']['key.with.dots']")).toBe("value2");
  });

  it("Arrays: Indexing and Slicing", async () => {
    // First book
    expect(await engine.run("$.store.book[0].title")).toBe("Sayings of the Century");
    
    // Last book - Jexl doesn't support negative index [-1] natively on arrays.
    // JSONPath supports slices like [-1:] to get the last element (as a list).
    // Our jp function unwraps single-element lists, so this returns the book object.
    expect(await engine.run("'$.store.book[-1:].title'")).toBe("The Lord of the Rings");
    
    // Slice: First two books (returns array) - Jexl doesn't support [0:2] slice syntax.
    // Must use JSONPath.
    const firstTwo = await engine.run("'$.store.book[0:2].title'");
    expect(firstTwo).toEqual(["Sayings of the Century", "Sword of Honour"]);
  });

  it("Wildcards", async () => {
    // All book titles - Wildcard * is not valid Jexl property access.
    const allTitles = await engine.run("'$.store.book[*].title'");
    expect(allTitles).toHaveLength(4);
    expect(allTitles).toContain("Moby Dick");
    
    // All prices in store (books and bicycle)
    // Note: ..price finds recursively - Not valid Jexl.
    const allPrices = await engine.run("'$..price'");
    // 4 books + 1 bicycle = 5 prices
    expect(allPrices).toHaveLength(5);
    expect(allPrices).toContain(19.95);
  });

  it("Filters: Comparisons", async () => {
    // Books cheaper than 10
    // [?(@...)] is JSONPath syntax.
    const cheapBooks = await engine.run("'$.store.book[?(@.price < 10)].title'");
    expect(cheapBooks).toEqual(["Sayings of the Century", "Moby Dick"]);
    
    // Books with specific category
    const fictionBooks = await engine.run("'$.store.book[?(@.category == \"fiction\")].title'");
    expect(fictionBooks).toHaveLength(3);
  });

  it("Filters: Existence and Regex", async () => {
    // Books with ISBN
    const booksWithIsbn = await engine.run("'$.store.book[?(@.isbn)].title'");
    expect(booksWithIsbn).toEqual(["Moby Dick", "The Lord of the Rings"]);
  });

  it("Complex Integration: Aggregation", async () => {
    // Sum of prices of all books
    // Calculate price of first book + bicycle price
    // Here we can use Jexl access for simple paths
    const total = await engine.run("$.store.book[0].price + $.store.bicycle.price");
    expect(total).toBe(28.9);
  });

  it("Complex Integration: Logic with Variables", async () => {
    // Find books more expensive than 'expensive' variable (10)
    
    // Approach 1: Use Jexl filter on the array returned by JSONPath
    // JSONPath: '$.store.book[*]' -> returns array of books
    // Jexl Filter: [.price > expensive]
    // Note: The parser converts '$.store.book[*]' to jp('$.store.book[*]').
    // We need to ensure Jexl can apply filter to the result of a function.
    // Syntax: jp('...') | [.price > expensive] ? No, Jexl filters are usually directly on identifier.
    // But let's try transform syntax if direct filter fails:
    // val | filterExpression? Jexl doesn't have a built-in filter transform like that.
    
    // Let's try to access the property as a Jexl variable directly, which works for this data structure.
    const expensiveBooksJexl = await engine.run("store.book[.price > expensive]");
    expect(expensiveBooksJexl).toHaveLength(2); 

    // Approach 2: Using JSONPath string result in Jexl pipeline
    // We need to make sure the result of jp() is treated as an array we can operate on.
    // If we can't do (expr)[filter], we can assign or use transforms.
    // Let's stick to the working Jexl syntax for now.
    
    // If we really want to filter the result of a JSONPath query using Jexl:
    // We might need a custom transform 'filter'.
    // But let's test if we can just use the result in a calculation.
    // Jexl doesn't support .length property access on arrays by default, so we use a length transform.
    const count = await engine.run("('$.store.book[*]' | length)");
    // Wait, parser already adds jp(). So "('$.store.book[*]')".
    // "jp('$.store.book[*]') | length"
    expect(count).toBe(4);
  });
  
  it("Recursive Descent with Filter", async () => {
    // All items (recursively) that have a price > 20
    const expensiveItems = await engine.run("'$..[?(@.price > 20)].title'");
    // The Lord of the Rings is 22.99
    // jp function unwraps single-element arrays, so we expect the string directly
    expect(expensiveItems).toEqual("The Lord of the Rings");
  });
});
