const TOKEN_TYPES = {
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
  OPERATOR: 'OPERATOR',
  IDENTIFIER: 'IDENTIFIER',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  NULL: 'NULL',
  COMMA: 'COMMA',
  FUNCTION: 'FUNCTION',
};

class Token {
  constructor(type, value, position) {
    this.type = type;
    this.value = value;
    this.position = position;
  }
}

class ExpressionNode {
  constructor(type, value = null, left = null, right = null) {
    this.type = type;
    this.value = value;
    this.left = left;
    this.right = right;
  }
}

class ConditionLexer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.tokens = [];
  }

  tokenize() {
    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;

      const ch = this.input[this.pos];

      if (ch === '(') {
        this.tokens.push(new Token(TOKEN_TYPES.LPAREN, '(', this.pos));
        this.pos++;
        continue;
      }

      if (ch === ')') {
        this.tokens.push(new Token(TOKEN_TYPES.RPAREN, ')', this.pos));
        this.pos++;
        continue;
      }

      if (ch === ',') {
        this.tokens.push(new Token(TOKEN_TYPES.COMMA, ',', this.pos));
        this.pos++;
        continue;
      }

      if (ch === "'") {
        this.readString();
        continue;
      }

      if (this.isDigit(ch) || (ch === '-' && this.isDigit(this.input[this.pos + 1]))) {
        this.readNumber();
        continue;
      }

      if (this.isLetter(ch) || ch === '_' || ch === '"') {
        this.readIdentifierOrKeyword();
        continue;
      }

      if (this.isOperatorChar(ch)) {
        this.readOperator();
        continue;
      }

      throw new Error(`Unexpected character '${ch}' at position ${this.pos}`);
    }

    return this.tokens;
  }

  skipWhitespace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  isLetter(ch) {
    return /[a-zA-Z]/.test(ch);
  }

  isDigit(ch) {
    return /[0-9]/.test(ch);
  }

  isOperatorChar(ch) {
    return ['=', '!', '<', '>', '+', '-', '*', '/'].includes(ch);
  }

  readString() {
    const startPos = this.pos;
    this.pos++;
    let value = '';

    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (ch === "'") {
        if (this.pos + 1 < this.input.length && this.input[this.pos + 1] === "'") {
          value += "'";
          this.pos += 2;
        } else {
          this.pos++;
          break;
        }
      } else {
        value += ch;
        this.pos++;
      }
    }

    this.tokens.push(new Token(TOKEN_TYPES.STRING, value, startPos));
  }

  readNumber() {
    const startPos = this.pos;
    let value = '';

    if (this.input[this.pos] === '-') {
      value += '-';
      this.pos++;
    }

    while (this.pos < this.input.length && (this.isDigit(this.input[this.pos]) || this.input[this.pos] === '.')) {
      value += this.input[this.pos];
      this.pos++;
    }

    const numValue = value.includes('.') ? parseFloat(value) : parseInt(value, 10);
    this.tokens.push(new Token(TOKEN_TYPES.NUMBER, numValue, startPos));
  }

  readIdentifierOrKeyword() {
    const startPos = this.pos;
    let value = '';

    if (this.input[this.pos] === '"') {
      this.pos++;
      while (this.pos < this.input.length && this.input[this.pos] !== '"') {
        value += this.input[this.pos];
        this.pos++;
      }
      this.pos++;
      this.tokens.push(new Token(TOKEN_TYPES.IDENTIFIER, value, startPos));
      return;
    }

    while (this.pos < this.input.length && 
           (this.isLetter(this.input[this.pos]) || this.isDigit(this.input[this.pos]) || this.input[this.pos] === '_' || this.input[this.pos] === '.')) {
      value += this.input[this.pos];
      this.pos++;
    }

    const upperValue = value.toUpperCase();

    if (upperValue === 'AND') {
      this.tokens.push(new Token(TOKEN_TYPES.AND, 'AND', startPos));
    } else if (upperValue === 'OR') {
      this.tokens.push(new Token(TOKEN_TYPES.OR, 'OR', startPos));
    } else if (upperValue === 'NOT') {
      this.tokens.push(new Token(TOKEN_TYPES.NOT, 'NOT', startPos));
    } else if (upperValue === 'IN') {
      this.tokens.push(new Token(TOKEN_TYPES.OPERATOR, 'IN', startPos));
    } else if (upperValue === 'IS') {
      this.tokens.push(new Token(TOKEN_TYPES.OPERATOR, 'IS', startPos));
    } else if (upperValue === 'BETWEEN') {
      this.tokens.push(new Token(TOKEN_TYPES.OPERATOR, 'BETWEEN', startPos));
    } else if (upperValue === 'LIKE') {
      this.tokens.push(new Token(TOKEN_TYPES.OPERATOR, 'LIKE', startPos));
    } else if (upperValue === 'NULL') {
      this.tokens.push(new Token(TOKEN_TYPES.NULL, null, startPos));
    } else if (upperValue === 'TRUE') {
      this.tokens.push(new Token(TOKEN_TYPES.BOOLEAN, true, startPos));
    } else if (upperValue === 'FALSE') {
      this.tokens.push(new Token(TOKEN_TYPES.BOOLEAN, false, startPos));
    } else {
      this.skipWhitespace();
      if (this.pos < this.input.length && this.input[this.pos] === '(') {
        this.tokens.push(new Token(TOKEN_TYPES.FUNCTION, value, startPos));
      } else {
        this.tokens.push(new Token(TOKEN_TYPES.IDENTIFIER, value, startPos));
      }
    }
  }

  readOperator() {
    const startPos = this.pos;
    const ch = this.input[this.pos];
    const nextCh = this.input[this.pos + 1];

    if (ch === '!' && nextCh === '=') {
      this.tokens.push(new Token(TOKEN_TYPES.OPERATOR, '!=', startPos));
      this.pos += 2;
      return;
    }

    if (ch === '<' && nextCh === '>') {
      this.tokens.push(new Token(TOKEN_TYPES.OPERATOR, '!=', startPos));
      this.pos += 2;
      return;
    }

    if (ch === '>' && nextCh === '=') {
      this.tokens.push(new Token(TOKEN_TYPES.OPERATOR, '>=', startPos));
      this.pos += 2;
      return;
    }

    if (ch === '<' && nextCh === '=') {
      this.tokens.push(new Token(TOKEN_TYPES.OPERATOR, '<=', startPos));
      this.pos += 2;
      return;
    }

    this.tokens.push(new Token(TOKEN_TYPES.OPERATOR, ch, startPos));
    this.pos++;
  }
}

class ConditionParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.errors = [];
    this.parenStack = [];
  }

  parse() {
    if (this.tokens.length === 0) {
      return null;
    }

    const ast = this.parseOrExpression();

    if (this.parenStack.length > 0) {
      this.errors.push({
        message: `Missing closing parenthesis at position ${this.parenStack[0].position}`
      });
    }

    return ast;
  }

  parseOrExpression() {
    let left = this.parseAndExpression();

    while (this.currentToken() && this.currentToken().type === TOKEN_TYPES.OR) {
      const operator = this.consume();
      const right = this.parseAndExpression();
      left = new ExpressionNode('logical', {
        operator: operator.value,
        position: operator.position
      }, left, right);
    }

    return left;
  }

  parseAndExpression() {
    let left = this.parseNotExpression();

    while (this.currentToken() && this.currentToken().type === TOKEN_TYPES.AND) {
      const operator = this.consume();
      const right = this.parseNotExpression();
      left = new ExpressionNode('logical', {
        operator: operator.value,
        position: operator.position
      }, left, right);
    }

    return left;
  }

  parseNotExpression() {
    if (this.currentToken() && this.currentToken().type === TOKEN_TYPES.NOT) {
      const operator = this.consume();
      const operand = this.parseNotExpression();
      return new ExpressionNode('unary', {
        operator: 'NOT',
        position: operator.position
      }, null, operand);
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.currentToken();

    if (!token) {
      this.errors.push({ message: 'Unexpected end of expression' });
      return null;
    }

    if (token.type === TOKEN_TYPES.LPAREN) {
      this.parenStack.push(token);
      this.consume();
      const expr = this.parseOrExpression();
      if (!this.currentToken() || this.currentToken().type !== TOKEN_TYPES.RPAREN) {
        this.errors.push({
          message: `Missing closing parenthesis for opening parenthesis at position ${token.position}`
        });
      } else {
        this.consume();
        this.parenStack.pop();
      }
      return expr;
    }

    if (token.type === TOKEN_TYPES.RPAREN) {
      this.errors.push({
        message: `Unexpected closing parenthesis at position ${token.position}`
      });
      this.consume();
      return this.parsePrimary();
    }

    return this.parseComparison();
  }

  parseComparison() {
    const left = this.parseValue();

    if (!left) {
      return null;
    }

    const operatorToken = this.currentToken();

    if (!operatorToken) {
      return left;
    }

    if (operatorToken.type === TOKEN_TYPES.OPERATOR) {
      const operator = this.consume();

      if (operator.value.toUpperCase() === 'IN') {
        return this.parseInExpression(left, operator);
      }

      if (operator.value.toUpperCase() === 'IS') {
        return this.parseIsExpression(left, operator);
      }

      if (operator.value.toUpperCase() === 'BETWEEN') {
        return this.parseBetweenExpression(left, operator);
      }

      const right = this.parseValue();
      return new ExpressionNode('comparison', {
        operator: operator.value,
        position: operator.position
      }, left, right);
    }

    return left;
  }

  parseInExpression(left, operator) {
    if (!this.currentToken() || this.currentToken().type !== TOKEN_TYPES.LPAREN) {
      this.errors.push({
        message: `Expected '(' after IN operator at position ${operator.position}`
      });
      return left;
    }

    this.consume();

    const values = [];

    while (this.currentToken() && this.currentToken().type !== TOKEN_TYPES.RPAREN) {
      const value = this.parseValue();
      if (value) values.push(value);
      if (this.currentToken() && this.currentToken().type === TOKEN_TYPES.COMMA) {
        this.consume();
      }
    }

    if (!this.currentToken() || this.currentToken().type !== TOKEN_TYPES.RPAREN) {
      this.errors.push({
        message: `Missing closing ')' for IN expression`
      });
    } else {
      this.consume();
    }

    return new ExpressionNode('in_expression', {
      position: operator.position
    }, left, values);
  }

  parseIsExpression(left, operator) {
    let not = null;
    if (this.currentToken() && this.currentToken().type === TOKEN_TYPES.NOT) {
      not = this.consume();
    }

    if (this.currentToken() && this.currentToken().type === TOKEN_TYPES.NULL) {
      const nullToken = this.consume();
      return new ExpressionNode('is_null', {
        not: not !== null,
        position: operator.position
      }, left, null);
    } else {
      this.errors.push({
        message: `Expected NULL after IS ${not ? 'NOT' : ''} at position ${operator.position}`
      });
      return left;
    }
  }

  parseBetweenExpression(left, operator) {
    const lower = this.parseValue();
    let andToken = null;

    if (this.currentToken() && this.currentToken().type === TOKEN_TYPES.AND) {
      andToken = this.consume();
    } else {
      this.errors.push({
        message: `Expected AND after lower bound in BETWEEN expression at position ${operator.position}`
      });
      return left;
    }

    const upper = this.parseValue();

    return new ExpressionNode('between', {
      position: operator.position
    }, left, [lower, upper]);
  }

  parseValue() {
    const token = this.currentToken();

    if (!token) {
      this.errors.push({ message: 'Expected value at end of expression' });
      return null;
    }

    if (token.type === TOKEN_TYPES.IDENTIFIER) {
      this.consume();
      return new ExpressionNode('identifier', {
        value: token.value,
        position: token.position
      });
    }

    if (token.type === TOKEN_TYPES.STRING) {
      this.consume();
      return new ExpressionNode('literal', {
        value: token.value,
        dataType: 'string',
        position: token.position
      });
    }

    if (token.type === TOKEN_TYPES.NUMBER) {
      this.consume();
      return new ExpressionNode('literal', {
        value: token.value,
        dataType: 'number',
        position: token.position
      });
    }

    if (token.type === TOKEN_TYPES.BOOLEAN) {
      this.consume();
      return new ExpressionNode('literal', {
        value: token.value,
        dataType: 'boolean',
        position: token.position
      });
    }

    if (token.type === TOKEN_TYPES.NULL) {
      this.consume();
      return new ExpressionNode('literal', {
        value: null,
        dataType: 'null',
        position: token.position
      });
    }

    if (token.type === TOKEN_TYPES.FUNCTION) {
      return this.parseFunctionCall();
    }

    if (token.type === TOKEN_TYPES.LPAREN) {
      return this.parsePrimary();
    }

    if (token.type === TOKEN_TYPES.NOT) {
      return this.parseNotExpression();
    }

    this.errors.push({
      message: `Unexpected token '${token.value}' at position ${token.position}`
    });
    this.consume();
    return null;
  }

  parseFunctionCall() {
    const funcName = this.consume();
    if (!this.currentToken() || this.currentToken().type !== TOKEN_TYPES.LPAREN) {
      this.errors.push({
        message: `Expected '(' after function name at position ${funcName.position}`
      });
      return new ExpressionNode('function_call', {
        name: funcName.value,
        position: funcName.position,
        arguments: []
      });
    }

    this.consume();

    const args = [];

    while (this.currentToken() && this.currentToken().type !== TOKEN_TYPES.RPAREN) {
      if (this.currentToken().type === TOKEN_TYPES.COMMA) {
        this.consume();
      } else {
        const arg = this.parseValue();
        if (arg) args.push(arg);
      }
    }

    if (!this.currentToken() || this.currentToken().type !== TOKEN_TYPES.RPAREN) {
      this.errors.push({
        message: `Missing closing ')' for function call at position ${funcName.position}`
      });
    } else {
      this.consume();
    }

    return new ExpressionNode('function_call', {
      name: funcName.value,
      position: funcName.position,
      arguments: args
    });
  }

  currentToken() {
    return this.tokens[this.pos] || null;
  }

  consume() {
    return this.tokens[this.pos++];
  }
}

class ConditionValidator {
  static validate(expression) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      ast: null,
      tokens: [],
      structure: null,
    };

    if (!expression || typeof expression !== 'string' || expression.trim() === '') {
      result.valid = false;
      result.errors.push({ message: 'Condition expression cannot be empty' });
      return result;
    }

    try {
      const lexer = new ConditionLexer(expression);
      const tokens = lexer.tokenize();
      result.tokens = tokens;

      const parser = new ConditionParser(tokens);
      const ast = parser.parse();

      result.errors = [...parser.errors];
      result.ast = ast;

      if (result.errors.length > 0) {
        result.valid = false;
      }

      result.structure = this.analyzeStructure(ast);
      result.referenced_columns = this.extractColumns(ast);
      result.complexity = this.calculateComplexity(ast);

      if (result.valid) {
        const warnings = this.checkForCommonMistakes(ast, expression);
        result.warnings = warnings;
      }

      return result;
    } catch (err) {
      result.valid = false;
      result.errors.push({ message: err.message });
    }

    return result;
  }

  static analyzeStructure(ast) {
    if (!ast) return null;

    const traverse = (node) => {
      if (!node) return null;

      const info = {
        type: node.type,
        operator: node.value ? node.value.operator || null : null,
        children: [],
      };

      if (node.left) info.children.push(traverse(node.left));
      if (node.right) {
        if (Array.isArray(node.right)) {
          info.children.push(node.right.map(n => traverse(n)));
        } else {
          info.children.push(traverse(node.right));
        }
      }

      return info;
    };

    return traverse(ast);
  }

  static extractColumns(ast) {
    const columns = new Set();

    const traverse = (node) => {
      if (!node) return;
      if (node.type === 'identifier') {
        columns.add(node.value.value);
      }
      if (node.left) traverse(node.left);
      if (node.right) {
        if (Array.isArray(node.right)) {
          node.right.forEach(n => traverse(n));
        } else {
          traverse(node.right);
        }
      }
    };

    traverse(ast);
    return Array.from(columns);
  }

  static calculateComplexity(ast) {
    let depth = 0;
    let andCount = 0;
    let orCount = 0;

    const traverse = (node, currentDepth = 0) => {
      if (!node) return;

      depth = Math.max(depth, currentDepth);

      if (node.type === 'logical') {
        if (node.value.operator === 'AND') andCount++;
        if (node.value.operator === 'OR') orCount++;
      }

      if (node.left) traverse(node.left, currentDepth + 1);
      if (node.right) {
        if (Array.isArray(node.right)) {
          node.right.forEach(n => traverse(n, currentDepth + 1));
        } else {
          traverse(node.right, currentDepth + 1);
        }
      }
    };

    traverse(ast);

    return {
      max_depth: depth,
      and_count: andCount,
      or_count: orCount,
      total_logical_operators: andCount + orCount,
    };
  }

  static checkForCommonMistakes(ast, originalExpression) {
    const warnings = [];

    const upperExpr = originalExpression.toUpperCase();

    if (upperExpr.includes(' OR ') && upperExpr.includes(' AND ')) {
      warnings.push({
        type: 'mixed_logical_operators',
        message: 'Expression contains both AND and OR operators. Ensure parentheses are used correctly to guarantee intended grouping.',
        severity: 'info'
      });
    }

    const hasTopLevelOr = this.hasTopLevelOr(ast);
    if (hasTopLevelOr) {
      warnings.push({
        type: 'top_level_or',
        message: 'Expression has top-level OR operator. This may cause unintended rows to be included if not properly grouped with parentheses.',
        severity: 'warning'
      });
    }

    return warnings;
  }

  static hasTopLevelOr(ast) {
    if (!ast) return false;

    const check = (node, parent = null) => {
      if (!node) return false;

      if (node.type === 'logical' && node.value.operator === 'OR' && !parent) {
        return true;
      }

      if (node.type === 'logical' && node.value.operator === 'AND') {
        return check(node.left, node) || check(node.right, node);
      }

      return false;
    };

    return check(ast);
  }

  static validatePolicy(policy) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (!policy) {
      result.valid = false;
      result.errors.push({ message: 'Policy cannot be null or undefined' });
      return result;
    }

    if (!policy.table_name) {
      result.valid = false;
      result.errors.push({ message: 'table_name is required' });
    }

    if (!policy.custom_condition && !policy.column_name) {
      result.valid = false;
      result.errors.push({ message: 'Either custom_condition or column_name must be provided' });
    }

    if (policy.custom_condition) {
      const conditionResult = this.validate(policy.custom_condition);
      result.condition_validation = conditionResult;

      if (!conditionResult.valid) {
        result.valid = false;
        result.errors = [...result.errors, ...conditionResult.errors];
      } else {
        result.warnings = [...result.warnings, ...conditionResult.warnings];
      }
    }

    if (policy.column_name && !policy.condition_operator) {
      result.valid = false;
      result.errors.push({ message: 'condition_operator is required when using column_name' });
    }

    const validOperators = ['IN', 'NOT IN', '=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IS NULL', 'IS NOT NULL', 'BETWEEN'];

    if (policy.condition_operator) {
      const op = policy.condition_operator.toUpperCase();
      if (!validOperators.includes(op)) {
        result.valid = false;
        result.errors.push({
          message: `Invalid operator '${policy.condition_operator}'. Valid operators: ${validOperators.join(', ')}`
        });
      }
    }

    if (policy.condition_operator === 'IN' || policy.condition_operator === 'NOT IN') {
      if (!policy.condition_value || !Array.isArray(policy.condition_value)) {
        result.valid = false;
        result.errors.push({ message: 'condition_value must be an array for IN/NOT IN operators' });
      }
    }

    if (policy.condition_operator === 'BETWEEN') {
      if (!policy.condition_value || !Array.isArray(policy.condition_value) || policy.condition_value.length !== 2) {
        result.valid = false;
        result.errors.push({ message: 'condition_value must be an array of two elements for BETWEEN operator' });
      }
    }

    return result;
  }
}

module.exports = {
  ConditionLexer,
  ConditionParser,
  ConditionValidator,
  Token,
  ExpressionNode,
  TOKEN_TYPES,
};
