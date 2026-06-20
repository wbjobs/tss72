const express = require('express');
const TenantService = require('../services/tenant.service');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const tenants = await TenantService.getAll();
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tenant = await TenantService.getById(req.params.id);
    res.json(tenant);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const tenant = await TenantService.create(req.body);
    res.status(201).json(tenant);
  } catch (err) {
    const status = err.message.includes('already exists') ? 409 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const tenant = await TenantService.update(req.params.id, req.body);
    res.json(tenant);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const tenant = await TenantService.delete(req.params.id);
    res.json({ message: 'Tenant deleted successfully', tenant });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
