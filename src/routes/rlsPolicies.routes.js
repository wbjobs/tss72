const express = require('express');
const RlsPolicyService = require('../services/rlsPolicy.service');

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
  try {
    const filters = { ...req.query };
    if (req.params.tenantId) {
      filters.tenant_id = req.params.tenantId;
    }
    const policies = await RlsPolicyService.getAll(filters);
    res.json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const policy = await RlsPolicyService.getById(req.params.id);
    res.json(policy);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const policyData = req.params.tenantId
      ? { ...req.body, tenant_id: req.params.tenantId }
      : req.body;
    const policy = await RlsPolicyService.create(policyData);
    res.status(201).json(policy);
  } catch (err) {
    let status = 400;
    if (err.message.includes('not found')) status = 404;
    if (err.message.includes('Validation error')) status = 400;
    res.status(status).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const policy = await RlsPolicyService.update(req.params.id, req.body);
    res.json(policy);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.patch('/:id/enable', async (req, res) => {
  try {
    const policy = await RlsPolicyService.toggleEnabled(req.params.id, true);
    res.json(policy);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.patch('/:id/disable', async (req, res) => {
  try {
    const policy = await RlsPolicyService.toggleEnabled(req.params.id, false);
    res.json(policy);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const policy = await RlsPolicyService.delete(req.params.id);
    res.json({ message: 'Policy deleted successfully', policy });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
