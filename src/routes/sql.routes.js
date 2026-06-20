const express = require('express');
const Joi = require('joi');
const SqlRewriter = require('../security/sqlRewriter');
const { SecureQueryExecutor } = require('../security/secureQuery');
const RlsPolicyService = require('../services/rlsPolicy.service');

const router = express.Router();
const sqlRewriter = new SqlRewriter();

const executeSchema = Joi.object({
  sql: Joi.string().required(),
  params: Joi.array().optional().default([]),
});

const previewSchema = Joi.object({
  sql: Joi.string().required(),
  policies: Joi.array().items(
    Joi.object({
      table_name: Joi.string().required(),
      column_name: Joi.string().optional().allow(null),
      condition_operator: Joi.string().optional(),
      condition_value: Joi.any().optional(),
      custom_condition: Joi.string().optional().allow(null),
    })
  ).optional().default([]),
  user_id: Joi.string().uuid().optional(),
  table_name: Joi.string().optional(),
});

router.post('/preview', async (req, res) => {
  try {
    const { error, value } = previewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    let policies = value.policies;

    if (value.user_id && value.table_name && (!policies || policies.length === 0)) {
      policies = await RlsPolicyService.getPoliciesForUser(value.user_id, value.table_name);
    }

    const originalSql = value.sql;
    let rewrittenSql = originalSql;
    let normalizedSql = originalSql;
    let tables = [];

    try {
      const ast = sqlRewriter.parse(originalSql);
      tables = sqlRewriter.extractTableNames(ast);
      normalizedSql = sqlRewriter.astToSql(ast);
      rewrittenSql = sqlRewriter.rewrite(originalSql, policies || []);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    res.json({
      original_sql: originalSql,
      rewritten_sql: rewrittenSql,
      normalized_sql: normalizedSql,
      tables_involved: tables,
      policies_applied: policies,
      is_modified: normalizedSql.trim() !== rewrittenSql.trim(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/execute', async (req, res) => {
  try {
    const { error, value } = executeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const executor = new SecureQueryExecutor(req.user.id, {
      bypassRls: req.user.bypassRls,
    });

    const result = await executor.query(value.sql, value.params);

    res.json({
      rowCount: result.rowCount,
      rows: result.rows,
      fields: result.fields ? result.fields.map(f => ({ name: f.name, dataType: f.dataTypeID })) : [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
