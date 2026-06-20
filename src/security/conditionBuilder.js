const { Parser } = require('node-sql-parser');

const parser = new Parser();

class ConditionBuilder {
  static escapeValue(value) {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return "'" + value.replace(/'/g, "''") + "'";
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.map(v => this.escapeValue(v)).join(', ');
    }
    if (typeof value === 'object') {
      return "'" + JSON.stringify(value).replace(/'/g, "''") + "'";
    }
    return String(value);
  }

  static buildConditionFromPolicy(policy) {
    if (policy.custom_condition) {
      return `(${policy.custom_condition})`;
    }

    const column = policy.column_name;
    const operator = policy.condition_operator;
    let value = policy.condition_value;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      value = [value];
    }

    switch (operator.toUpperCase()) {
      case 'IN':
        return `${column} IN (${this.escapeValue(value)})`;

      case 'NOT IN':
        return `${column} NOT IN (${this.escapeValue(value)})`;

      case '=':
        return `${column} = ${this.escapeValue(value[0])}`;

      case '!=':
      case '<>':
        return `${column} != ${this.escapeValue(value[0])}`;

      case '>':
        return `${column} > ${this.escapeValue(value[0])}`;

      case '<':
        return `${column} < ${this.escapeValue(value[0])}`;

      case '>=':
        return `${column} >= ${this.escapeValue(value[0])}`;

      case '<=':
        return `${column} <= ${this.escapeValue(value[0])}`;

      case 'LIKE':
        return `${column} LIKE ${this.escapeValue(value[0])}`;

      case 'IS NULL':
        return `${column} IS NULL`;

      case 'IS NOT NULL':
        return `${column} IS NOT NULL`;

      case 'BETWEEN':
        if (!Array.isArray(value) || value.length !== 2) {
          throw new Error('BETWEEN operator requires exactly two values');
        }
        return `${column} BETWEEN ${this.escapeValue(value[0])} AND ${this.escapeValue(value[1])}`;

      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  static combineConditions(conditions) {
    if (!conditions || conditions.length === 0) {
      return null;
    }
    const validConditions = conditions.filter(c => c && c.trim().length > 0);
    if (validConditions.length === 0) return null;
    if (validConditions.length === 1) return validConditions[0];
    return validConditions.map(c => `(${c})`).join(' AND ');
  }
}

module.exports = ConditionBuilder;
