const ConditionBuilder = require('../../src/security/conditionBuilder');

describe('ConditionBuilder', () => {
  describe('escapeValue', () => {
    it('should escape string values with single quotes', () => {
      expect(ConditionBuilder.escapeValue("hello")).toBe("'hello'");
    });

    it('should escape single quotes within strings', () => {
      expect(ConditionBuilder.escapeValue("it's")).toBe("'it''s'");
    });

    it('should handle null values', () => {
      expect(ConditionBuilder.escapeValue(null)).toBe('NULL');
      expect(ConditionBuilder.escapeValue(undefined)).toBe('NULL');
    });

    it('should handle numbers as-is', () => {
      expect(ConditionBuilder.escapeValue(42)).toBe('42');
      expect(ConditionBuilder.escapeValue(3.14)).toBe('3.14');
    });

    it('should handle booleans as TRUE/FALSE', () => {
      expect(ConditionBuilder.escapeValue(true)).toBe('TRUE');
      expect(ConditionBuilder.escapeValue(false)).toBe('FALSE');
    });

    it('should handle arrays of values', () => {
      expect(ConditionBuilder.escapeValue(['a', 'b', 'c'])).toBe("'a', 'b', 'c'");
      expect(ConditionBuilder.escapeValue([1, 2, 3])).toBe('1, 2, 3');
    });

    it('should handle objects as JSON strings', () => {
      const result = ConditionBuilder.escapeValue({ key: 'value' });
      expect(result).toContain('"key"');
      expect(result).toContain('"value"');
    });
  });

  describe('buildConditionFromPolicy', () => {
    it('should use custom_condition when provided', () => {
      const policy = { custom_condition: "status = 'active'" };
      expect(ConditionBuilder.buildConditionFromPolicy(policy))
        .toBe("(status = 'active')");
    });

    it('should build IN condition correctly', () => {
      const policy = {
        column_name: 'status',
        condition_operator: 'IN',
        condition_value: ['pending', 'active'],
      };
      const result = ConditionBuilder.buildConditionFromPolicy(policy);
      expect(result).toBe("status IN ('pending', 'active')");
    });

    it('should build NOT IN condition correctly', () => {
      const policy = {
        column_name: 'status',
        condition_operator: 'NOT IN',
        condition_value: ['deleted', 'archived'],
      };
      const result = ConditionBuilder.buildConditionFromPolicy(policy);
      expect(result).toBe("status NOT IN ('deleted', 'archived')");
    });

    it('should build = condition correctly', () => {
      const policy = {
        column_name: 'tenant_id',
        condition_operator: '=',
        condition_value: 't123',
      };
      expect(ConditionBuilder.buildConditionFromPolicy(policy))
        .toBe("tenant_id = 't123'");
    });

    it('should build != condition correctly', () => {
      const policy = {
        column_name: 'status',
        condition_operator: '!=',
        condition_value: 'deleted',
      };
      expect(ConditionBuilder.buildConditionFromPolicy(policy))
        .toBe("status != 'deleted'");
    });

    it('should build > condition correctly', () => {
      const policy = {
        column_name: 'amount',
        condition_operator: '>',
        condition_value: 1000,
      };
      expect(ConditionBuilder.buildConditionFromPolicy(policy))
        .toBe('amount > 1000');
    });

    it('should build < condition correctly', () => {
      const policy = {
        column_name: 'amount',
        condition_operator: '<',
        condition_value: 1000,
      };
      expect(ConditionBuilder.buildConditionFromPolicy(policy))
        .toBe('amount < 1000');
    });

    it('should build >= condition correctly', () => {
      const policy = {
        column_name: 'created_at',
        condition_operator: '>=',
        condition_value: '2024-01-01',
      };
      expect(ConditionBuilder.buildConditionFromPolicy(policy))
        .toBe("created_at >= '2024-01-01'");
    });

    it('should build <= condition correctly', () => {
      const policy = {
        column_name: 'priority',
        condition_operator: '<=',
        condition_value: 3,
      };
      expect(ConditionBuilder.buildConditionFromPolicy(policy))
        .toBe('priority <= 3');
    });

    it('should build LIKE condition correctly', () => {
      const policy = {
        column_name: 'name',
        condition_operator: 'LIKE',
        condition_value: '%test%',
      };
      expect(ConditionBuilder.buildConditionFromPolicy(policy))
        .toBe("name LIKE '%test%'");
    });

    it('should build IS NULL condition correctly', () => {
      const policy = {
        column_name: 'deleted_at',
        condition_operator: 'IS NULL',
      };
      expect(ConditionBuilder.buildConditionFromPolicy(policy))
        .toBe('deleted_at IS NULL');
    });

    it('should build IS NOT NULL condition correctly', () => {
      const policy = {
        column_name: 'deleted_at',
        condition_operator: 'IS NOT NULL',
      };
      expect(ConditionBuilder.buildConditionFromPolicy(policy))
        .toBe('deleted_at IS NOT NULL');
    });

    it('should build BETWEEN condition correctly', () => {
      const policy = {
        column_name: 'amount',
        condition_operator: 'BETWEEN',
        condition_value: [100, 1000],
      };
      expect(ConditionBuilder.buildConditionFromPolicy(policy))
        .toBe('amount BETWEEN 100 AND 1000');
    });

    it('should throw error for BETWEEN without exactly two values', () => {
      const policy = {
        column_name: 'amount',
        condition_operator: 'BETWEEN',
        condition_value: [100],
      };
      expect(() => ConditionBuilder.buildConditionFromPolicy(policy))
        .toThrow('BETWEEN operator requires exactly two values');
    });

    it('should throw error for unsupported operator', () => {
      const policy = {
        column_name: 'status',
        condition_operator: 'EXISTS',
        condition_value: 'test',
      };
      expect(() => ConditionBuilder.buildConditionFromPolicy(policy))
        .toThrow('Unsupported operator: EXISTS');
    });

    it('should handle single string value as array for IN-like operators', () => {
      const policy = {
        column_name: 'status',
        condition_operator: 'IN',
        condition_value: 'active',
      };
      expect(ConditionBuilder.buildConditionFromPolicy(policy))
        .toBe("status IN ('active')");
    });
  });

  describe('combineConditions', () => {
    it('should return null for empty conditions', () => {
      expect(ConditionBuilder.combineConditions([])).toBeNull();
      expect(ConditionBuilder.combineConditions(null)).toBeNull();
    });

    it('should return single condition as-is', () => {
      expect(ConditionBuilder.combineConditions(["status = 'active'"]))
        .toBe("status = 'active'");
    });

    it('should combine multiple conditions with AND', () => {
      const result = ConditionBuilder.combineConditions([
        "status = 'active'",
        "tenant_id = 't1'",
      ]);
      expect(result).toBe("(status = 'active') AND (tenant_id = 't1')");
    });

    it('should filter out empty conditions', () => {
      const result = ConditionBuilder.combineConditions([
        "status = 'active'",
        '',
        null,
        '  ',
      ]);
      expect(result).toBe("status = 'active'");
    });

    it('should combine three or more conditions', () => {
      const result = ConditionBuilder.combineConditions([
        "status = 'active'",
        "tenant_id = 't1'",
        'amount > 100',
      ]);
      expect(result).toBe(
        "(status = 'active') AND (tenant_id = 't1') AND (amount > 100)"
      );
    });
  });
});
