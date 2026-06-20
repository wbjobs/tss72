const { ConditionValidator, ConditionLexer, ConditionParser } = require('../../src/security/conditionValidator');

describe('ConditionValidator', () => {
  describe('validate', () => {
    it('should validate simple condition', () => {
      const result = ConditionValidator.validate("status = 'active'");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.referenced_columns).toContain('status');
    });

    it('should handle mixed AND and OR with parentheses correctly', () => {
      const condition = "(status = 'active' AND region = 'us') OR (status = 'pending')";
      const result = ConditionValidator.validate(condition);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.complexity.and_count).toBe(1);
      expect(result.complexity.or_count).toBe(1);
      expect(result.complexity.total_logical_operators).toBe(2);
    });

    it('should preserve parenthesis grouping in AST structure', () => {
      const condition = "(status = 'active' AND region = 'us') OR (status = 'pending')";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.structure.type).toBe('logical');
      expect(result.structure.operator).toBe('OR');
      expect(result.structure.children).toHaveLength(2);
      
      const leftChild = result.structure.children[0];
      expect(leftChild.type).toBe('logical');
      expect(leftChild.operator).toBe('AND');
      expect(leftChild.children).toHaveLength(2);
      
      const rightChild = result.structure.children[1];
      expect(rightChild.type).toBe('comparison');
    });

    it('should handle deeply nested parentheses', () => {
      const condition = "((status = 'active' AND region = 'us') OR (status = 'pending')) AND is_deleted = FALSE";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.complexity.and_count).toBe(2);
      expect(result.complexity.or_count).toBe(1);
      expect(result.complexity.max_depth).toBeGreaterThan(1);
    });

    it('should detect mismatched parentheses - missing closing', () => {
      const condition = "(status = 'active' AND region = 'us' OR status = 'pending'";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('Missing closing'))).toBe(true);
    });

    it('should detect mismatched parentheses - extra closing', () => {
      const condition = "status = 'active')";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('Unexpected closing'))).toBe(true);
    });

    it('should handle multiple OR and AND combinations', () => {
      const condition = "(a = 1 AND b = 2) OR (c = 3 AND d = 4) OR (e = 5 AND f = 6)";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.complexity.and_count).toBe(3);
      expect(result.complexity.or_count).toBe(2);
    });

    it('should handle condition with IN operator and list', () => {
      const condition = "status IN ('active', 'pending', 'review')";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.structure.type).toBe('in_expression');
    });

    it('should handle IS NULL operator', () => {
      const condition = "deleted_at IS NULL OR status = 'active'";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.complexity.or_count).toBe(1);
    });

    it('should handle IS NOT NULL operator', () => {
      const condition = "approved_at IS NOT NULL AND status = 'active'";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.complexity.and_count).toBe(1);
    });

    it('should handle BETWEEN operator', () => {
      const condition = "amount BETWEEN 100 AND 1000 AND status = 'active'";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.complexity.and_count).toBe(1);
    });

    it('should handle LIKE operator', () => {
      const condition = "name LIKE '%test%' OR email LIKE '%@example.com'";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.complexity.or_count).toBe(1);
    });

    it('should handle function calls in condition', () => {
      const condition = "created_at > NOW() - INTERVAL '7 days' AND status = 'active'";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.complexity.and_count).toBe(1);
    });

    it('should handle NOT operator', () => {
      const condition = "NOT is_deleted AND status = 'active'";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.structure.type).toBe('logical');
      expect(result.structure.operator).toBe('AND');
      expect(result.structure.children[0].type).toBe('unary');
      expect(result.structure.children[0].operator).toBe('NOT');
    });

    it('should handle NOT IN operator', () => {
      const condition = "status NOT IN ('deleted', 'archived')";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
    });

    it('should handle empty string as invalid', () => {
      const result = ConditionValidator.validate('');
      expect(result.valid).toBe(false);
    });

    it('should handle null as invalid', () => {
      const result = ConditionValidator.validate(null);
      expect(result.valid).toBe(false);
    });

    it('should extract all referenced columns', () => {
      const condition = "(status = 'active' AND region = 'us') OR (status = 'pending' AND priority > 5)";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.referenced_columns).toContain('status');
      expect(result.referenced_columns).toContain('region');
      expect(result.referenced_columns).toContain('priority');
    });

    it('should warn when mixing AND and OR without parentheses', () => {
      const condition = "status = 'active' AND region = 'us' OR status = 'pending'";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.type === 'mixed_logical_operators')).toBe(true);
    });

    it('should warn when there is top-level OR operator', () => {
      const condition = "status = 'active' OR status = 'pending'";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.type === 'top_level_or')).toBe(true);
    });

    it('should handle comparison operators', () => {
      const condition = "amount > 1000 AND amount < 5000 AND priority >= 3";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.complexity.and_count).toBe(2);
    });

    it('should handle != and <> operators', () => {
      const condition = "status != 'deleted' AND type <> 'internal'";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.complexity.and_count).toBe(1);
    });

    it('should handle numeric values correctly', () => {
      const condition = "amount = 123.45 OR count < -5";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.complexity.or_count).toBe(1);
    });

    it('should handle escaped single quotes in strings', () => {
      const condition = "name = 'O''Brien' OR description = 'it''s a test'";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.complexity.or_count).toBe(1);
    });

    it('should handle quoted identifiers', () => {
      const condition = '"myColumn" = 1 AND "Another-Column" = 2';
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
    });

    it('should handle complex nested scenario from issue', () => {
      const condition = "(status = 'active' AND region = 'us') OR (status = 'pending')";
      const result = ConditionValidator.validate(condition);

      expect(result.valid).toBe(true);
      expect(result.structure.type).toBe('logical');
      expect(result.structure.operator).toBe('OR');
      
      const leftGroup = result.structure.children[0];
      expect(leftGroup.type).toBe('logical');
      expect(leftGroup.operator).toBe('AND');
      expect(leftGroup.children).toHaveLength(2);
      
      const leftLeft = leftGroup.children[0];
      expect(leftLeft.type).toBe('comparison');
      expect(leftLeft.left.value.value).toBe('status');
      expect(leftLeft.right.value.value).toBe('active');
      
      const leftRight = leftGroup.children[1];
      expect(leftRight.type).toBe('comparison');
      expect(leftRight.left.value.value).toBe('region');
      expect(leftRight.right.value.value).toBe('us');
      
      const rightGroup = result.structure.children[1];
      expect(rightGroup.type).toBe('comparison');
      expect(rightGroup.left.value.value).toBe('status');
      expect(rightGroup.right.value.value).toBe('pending');
    });
  });

  describe('validatePolicy', () => {
    it('should validate policy with custom_condition', () => {
      const policy = {
        table_name: 'orders',
        custom_condition: "(status = 'active' AND region = 'us') OR (status = 'pending')",
      };
      const result = ConditionValidator.validatePolicy(policy);
      expect(result.valid).toBe(true);
      expect(result.condition_validation).toBeDefined();
      expect(result.condition_validation.valid).toBe(true);
    });

    it('should validate policy with column_name and operator', () => {
      const policy = {
        table_name: 'orders',
        column_name: 'status',
        condition_operator: 'IN',
        condition_value: ['active', 'pending'],
      };
      const result = ConditionValidator.validatePolicy(policy);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid custom_condition', () => {
      const policy = {
        table_name: 'orders',
        custom_condition: "(status = 'active' AND region = 'us'",
      };
      const result = ConditionValidator.validatePolicy(policy);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require either custom_condition or column_name', () => {
      const policy = {
        table_name: 'orders',
      };
      const result = ConditionValidator.validatePolicy(policy);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Either custom_condition or column_name'))).toBe(true);
    });

    it('should require table_name', () => {
      const policy = {
        custom_condition: "status = 'active'",
      };
      const result = ConditionValidator.validatePolicy(policy);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('table_name is required'))).toBe(true);
    });

    it('should validate IN operator requires array condition_value', () => {
      const policy = {
        table_name: 'orders',
        column_name: 'status',
        condition_operator: 'IN',
        condition_value: 'active',
      };
      const result = ConditionValidator.validatePolicy(policy);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('array'))).toBe(true);
    });

    it('should validate BETWEEN operator requires two values', () => {
      const policy = {
        table_name: 'orders',
        column_name: 'amount',
        condition_operator: 'BETWEEN',
        condition_value: [100],
      };
      const result = ConditionValidator.validatePolicy(policy);
      expect(result.valid).toBe(false);
    });

    it('should validate invalid operator', () => {
      const policy = {
        table_name: 'orders',
        column_name: 'status',
        condition_operator: 'INVALID_OP',
        condition_value: 'active',
      };
      const result = ConditionValidator.validatePolicy(policy);
      expect(result.valid).toBe(false);
    });

    it('should handle null policy', () => {
      const result = ConditionValidator.validatePolicy(null);
      expect(result.valid).toBe(false);
    });

    it('should warn about mixed operators in custom_condition', () => {
      const policy = {
        table_name: 'orders',
        custom_condition: "status = 'active' AND region = 'us' OR status = 'pending'",
      };
      const result = ConditionValidator.validatePolicy(policy);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should correctly parse the problematic case from the issue', () => {
      const policy = {
        table_name: 'orders',
        custom_condition: "(status = 'active' AND region = 'us') OR (status = 'pending')",
      };
      const result = ConditionValidator.validatePolicy(policy);
      
      expect(result.valid).toBe(true);
      expect(result.condition_validation).toBeDefined();
      expect(result.condition_validation.valid).toBe(true);
      
      const structure = result.condition_validation.structure;
      expect(structure.type).toBe('logical');
      expect(structure.operator).toBe('OR');
      expect(structure.children).toHaveLength(2);
      expect(structure.children[0].type).toBe('logical');
      expect(structure.children[0].operator).toBe('AND');
      expect(structure.children[0].children).toHaveLength(2);
      expect(structure.children[1].type).toBe('comparison');
    });
  });
});

describe('ConditionLexer', () => {
  it('should tokenize simple condition', () => {
    const lexer = new ConditionLexer("status = 'active'");
    const tokens = lexer.tokenize();
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe('IDENTIFIER');
    expect(tokens[0].value).toBe('status');
    expect(tokens[1].type).toBe('OPERATOR');
    expect(tokens[1].value).toBe('=');
    expect(tokens[2].type).toBe('STRING');
    expect(tokens[2].value).toBe('active');
  });

  it('should tokenize parentheses correctly', () => {
    const lexer = new ConditionLexer("(a = 1 AND b = 2) OR c = 3");
    const tokens = lexer.tokenize();
    const types = tokens.map(t => t.type);
    expect(types).toContain('LPAREN');
    expect(types).toContain('RPAREN');
    expect(types.filter(t => t === 'LPAREN').length).toBe(1);
    expect(types.filter(t => t === 'RPAREN').length).toBe(1);
  });

  it('should recognize AND and OR as logical operators', () => {
    const lexer = new ConditionLexer("a = 1 AND b = 2 OR c = 3");
    const tokens = lexer.tokenize();
    const types = tokens.map(t => t.type);
    expect(types).toContain('AND');
    expect(types).toContain('OR');
  });
});

describe('ConditionParser', () => {
  it('should parse simple comparison', () => {
    const lexer = new ConditionLexer("status = 'active'");
    const tokens = lexer.tokenize();
    const parser = new ConditionParser(tokens);
    const ast = parser.parse();

    expect(ast).not.toBeNull();
    expect(ast.type).toBe('comparison');
    expect(ast.left.value.value).toBe('status');
    expect(ast.right.value.value).toBe('active');
  });

  it('should give AND higher precedence than OR', () => {
    const lexer = new ConditionLexer("a = 1 AND b = 2 OR c = 3");
    const tokens = lexer.tokenize();
    const parser = new ConditionParser(tokens);
    const ast = parser.parse();

    expect(ast.type).toBe('logical');
    expect(ast.value.operator).toBe('OR');
    expect(ast.left.type).toBe('logical');
    expect(ast.left.value.operator).toBe('AND');
    expect(ast.left.left.left.value.value).toBe('a');
    expect(ast.left.right.left.value.value).toBe('b');
    expect(ast.right.left.value.value).toBe('c');
  });

  it('should respect parentheses grouping', () => {
    const lexer = new ConditionLexer("(a = 1 AND b = 2) OR (c = 3 AND d = 4)");
    const tokens = lexer.tokenize();
    const parser = new ConditionParser(tokens);
    const ast = parser.parse();

    expect(ast.type).toBe('logical');
    expect(ast.value.operator).toBe('OR');
    expect(ast.left.type).toBe('logical');
    expect(ast.left.value.operator).toBe('AND');
    expect(ast.right.type).toBe('logical');
    expect(ast.right.value.operator).toBe('AND');
  });

  it('should report error for mismatched parentheses', () => {
    const lexer = new ConditionLexer("(a = 1 AND b = 2");
    const tokens = lexer.tokenize();
    const parser = new ConditionParser(tokens);
    parser.parse();

    expect(parser.errors.length).toBeGreaterThan(0);
  });
});
