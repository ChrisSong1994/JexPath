# JexPath Expression Guide for AI

This document helps AI understand user requirements and generate correct JexPath expressions.

## Overview

JexPath is a strict expression engine that combines Jexl's computation capabilities with JSONPath's query capabilities. All property access MUST start with `$` (root reference).

## Quick Reference

### Data Access (JSONPath)

| User Intent | Expression Example |
|-------------|-------------------|
| Access property | `$.store.name` |
| Access with bracket notation | `$['store']['name']` |
| Access array element | `$.items[0]` |
| Access nested property | `$.user.address.city` |
| Special characters in key | `$['key with spaces']` |

### Array Operations

| User Intent | Expression Example |
|-------------|-------------------|
| Get first element | `$.items[0]` |
| Get last element | `'$.items[-1:]'` |
| Get range (first two) | `'$.items[0:2]'` |
| Get all elements | `'$.items[*]'` |
| Recursive search | `'$..price'` |

### Filtering

| User Intent | Expression Example |
|-------------|-------------------|
| Filter by condition | `'$.store.book[?(@.price < 10)]'` |
| Filter with AND | `'$.store.book[?(@.price < 10 && @.inStock == true)]'` |
| Filter with OR | `'$.items[?(@.status == "active" \|\| @.status == "pending")]'` |
| Check existence | `'$.store.book[?(@.isbn)]'` |
| Filter and get property | `'$.store.book[?(@.price < 10)].title'` |

**Note**: JSONPath filter expressions use `@` to reference current element. Wrap JSONPath expressions in quotes when using special syntax.

### Arithmetic Operations

| User Intent | Expression Example |
|-------------|-------------------|
| Addition | `$.a + $.b` |
| Subtraction | `$.price - $.discount` |
| Multiplication | `$.price * 0.9` |
| Division | `$.total / $.count` |
| Modulo | `$.num % 10` |
| Power | `$.base ** 2` |

### String Operations

| User Intent | Expression Example |
|-------------|-------------------|
| Concatenation | `'Hello' + ' ' + $.name` |
| Concat with number | `'Age: ' + $.age` |
| String in expression | `$.prefix + $.id + ' (' + $.name + ')'` |

### Comparison Operations

| User Intent | Expression Example |
|-------------|-------------------|
| Equal | `$.status == 'active'` |
| Not equal | `$.type != 'admin'` |
| Greater than | `$.price > 100` |
| Less than | `$.age < 18` |
| Greater or equal | `$.score >= 60` |
| Less or equal | `$.count <= 10` |

### Logical Operations

| User Intent | Expression Example |
|-------------|-------------------|
| AND | `$.active && $.verified` |
| OR | `$.isAdmin \|\| $.isModerator` |
| NOT | `!$.blocked` |
| Complex logic | `($.age > 18) && ($.active \|\| $.vip)` |

### Conditional Expression

| User Intent | Expression Example |
|-------------|-------------------|
| If-else | `$.score > 60 ? 'Pass' : 'Fail'` |
| Nested condition | `$.score >= 90 ? 'A' : $.score >= 80 ? 'B' : 'C'` |
| With computation | `$.price > 100 ? $.price * 0.9 : $.price` |

## Built-in Functions

### SIZE(val) - Get Length

Returns the length of an array or string.

```
SIZE($.items)        // Array length
SIZE($.name)         // String length
SIZE('hello')        // Returns 5
```

**Parameters**: 1 argument (string or array)

### REPLACE(str, search, replace) - String Replacement

Replaces substring or regex pattern in a string.

```
REPLACE($.text, 'old', 'new')           // Simple replacement
REPLACE($.text, /\s+/, '-')             // Regex replacement
REPLACE($.text, /\s+$/g, '')            // Trim trailing spaces
```

**Parameters**: 3 arguments (string, search pattern, replacement string)

### TRIM(str) - Remove Whitespace

Removes leading and trailing whitespace from a string.

```
TRIM($.name)         // "  hello  " -> "hello"
TRIM('  test  ')     // Returns "test"
```

**Parameters**: 1 argument (string)

### DATE(val, format) - Format Date

Formats a date string or timestamp.

```
DATE($.timestamp, 'YYYY-MM-DD')              // Timestamp to date
DATE($.dateStr, 'YYYY-MM-DD HH:mm:ss')       // Format date string
DATE(1672531200000, 'YYYY-MM-DD')            // Returns "2023-01-01"
```

**Parameters**: 1-2 arguments (date value, format string)

### PARSE_JSON(str) - Parse JSON String

Parses a JSON string into an object, enabling property access.

```
PARSE_JSON($.jsonStr)                          // Returns parsed object
PARSE_JSON($.meta).lastLogin                   // Access property after parsing
PARSE_JSON('{"score": 100}').score             // Returns 100
```

**Parameters**: 1 argument (JSON string)

### MAPPING(val, mapping) - Value Mapping

Maps a value to another based on a mapping object or array.

```
MAPPING($.status, {1: 'Active', 2: 'Inactive'})     // Object mapping
MAPPING($.index, ['First', 'Second', 'Third'])      // Array mapping (0-indexed)
MAPPING($.code, {'A': 'Excellent', 'B': 'Good'})    // String key mapping
MAPPING($.a, $.object.arr)                          // Use data as mapping
```

**Parameters**: 2 arguments (value to map, mapping object/array)

## Common Patterns

### Pattern 1: Filter and Compute

User: "Get the total price of items with quantity greater than 5"

```
'$.items[?(@.quantity > 5)].price'
```

Then sum the results (if multiple items match).

### Pattern 2: Conditional Discount

User: "Apply 10% discount if price is over 100, otherwise no discount"

```
$.price > 100 ? $.price * 0.9 : $.price
```

### Pattern 3: String Formatting

User: "Create an ID string with prefix and name"

```
$.prefix + '-' + $.id + ' (' + $.name + ')'
```

### Pattern 4: JSON String Processing

User: "Parse the metadata field and get the userId"

```
PARSE_JSON($.metadata).userId
```

### Pattern 5: Value Transformation

User: "Convert status code 1 to 'Active', 2 to 'Inactive'"

```
MAPPING($.statusCode, {1: 'Active', 2: 'Inactive'})
```

### Pattern 6: Date Formatting

User: "Format the createdAt timestamp to YYYY-MM-DD"

```
DATE($.createdAt, 'YYYY-MM-DD')
```

### Pattern 7: Complex Filtering

User: "Get titles of books priced under 10 that are in stock"

```
'$.store.book[?(@.price < 10 && @.inStock == true)].title'
```

### Pattern 8: String Cleaning

User: "Remove all spaces and convert to lowercase"

```
TRIM(REPLACE(REPLACE($.text, ' ', ''), /\s+/, ''))
```

## Important Rules

1. **All property access must start with `$`**
   - Correct: `$.user.name`
   - Incorrect: `user.name`

2. **Use bracket notation for special characters**
   - `$['key with spaces']`
   - `$['key.with.dots']`

3. **JSONPath special syntax requires quotes**
   - `'$.items[*]'` (not `$.items[*]`)
   - `'$..price'` (not `$..price`)
   - `'$.items[?(@.active)]'` (not `$.items[?(@.active)]`)

4. **Type coercion is automatic for + operator**
   - `'Count: ' + 5` results in `"Count: 5"`
   - `5 + '5'` results in `"55"`

5. **Filter expressions use `@` for current element**
   - `@.price` refers to the current item's price in a filter

6. **Functions are case-sensitive**
   - `SIZE()` is correct
   - `size()` will fail

## Error Prevention

| Common Error | Correct Approach |
|--------------|-----------------|
| `user.name` | `$.user.name` |
| `$.items[*]` (without quotes) | `'$.items[*]'` |
| `SIZE()` (no args) | `SIZE($.items)` |
| `1 - 'a'` | Type mismatch - avoid |
| `UNKNOWN()` | Only use built-in functions |

## Expression Generation Workflow

When a user describes their requirement:

1. **Identify the data source**: What data is being accessed?
2. **Determine the operation**: Query, compute, transform, or combine?
3. **Select appropriate syntax**:
   - Simple property access: `$.property`
   - Array filtering: `'$.array[?(@.condition)]'`
   - Computation: arithmetic operators
   - Transformation: built-in functions
4. **Combine as needed**: Nest functions, chain operations
5. **Validate**: Ensure all property access starts with `$`

## Examples by User Intent

| User Request | Generated Expression |
|--------------|---------------------|
| "Get the user's name" | `$.user.name` |
| "Get the first item's price" | `$.items[0].price` |
| "Get all product names" | `'$.products[*].name'` |
| "Find users older than 18" | `'$.users[?(@.age > 18)]'` |
| "Calculate total: price times quantity" | `$.price * $.quantity` |
| "Get full name from first and last" | `$.firstName + ' ' + $.lastName` |
| "Check if user is admin" | `$.user.role == 'admin'` |
| "Get active status label" | `$.active ? 'Active' : 'Inactive'` |
| "Count items in the list" | `SIZE($.items)` |
| "Clean up the text field" | `TRIM($.text)` |
| "Format the date field" | `DATE($.date, 'YYYY-MM-DD')` |
| "Parse JSON and get value" | `PARSE_JSON($.jsonField).targetKey` |
| "Map status code to label" | `MAPPING($.status, {1: 'On', 0: 'Off'})` |
| "Get cheap book titles" | `'$.books[?(@.price < 10)].title'` |
| "Calculate discounted price" | `$.price > 100 ? $.price * 0.9 : $.price` |
