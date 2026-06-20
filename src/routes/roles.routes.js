const express = require('express');
const RoleService = require('../services/role.service');

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
  try {
    const roles = await RoleService.getAll(req.params.tenantId);
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const role = await RoleService.getById(req.params.id);
    res.json(role);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const role = await RoleService.create(req.params.tenantId, req.body);
    res.status(201).json(role);
  } catch (err) {
    let status = 400;
    if (err.message.includes('already exists')) status = 409;
    if (err.message.includes('Tenant not found')) status = 404;
    res.status(status).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const role = await RoleService.update(req.params.id, req.body);
    res.json(role);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const role = await RoleService.delete(req.params.id);
    res.json({ message: 'Role deleted successfully', role });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
