const express = require('express');
const UserService = require('../services/user.service');

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
  try {
    const users = await UserService.getAll(req.params.tenantId);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await UserService.getById(req.params.id);
    res.json(user);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.get('/:id/roles', async (req, res) => {
  try {
    const roles = await UserService.getRoles(req.params.id);
    res.json(roles);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = await UserService.create(req.params.tenantId, req.body);
    res.status(201).json(user);
  } catch (err) {
    let status = 400;
    if (err.message.includes('already exists')) status = 409;
    if (err.message.includes('Tenant not found')) status = 404;
    res.status(status).json({ error: err.message });
  }
});

router.post('/:id/roles/:roleId', async (req, res) => {
  try {
    const result = await UserService.assignRole(req.params.id, req.params.roleId);
    res.json(result);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const user = await UserService.update(req.params.id, req.body);
    res.json(user);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = await UserService.delete(req.params.id);
    res.json({ message: 'User deleted successfully', user });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.delete('/:id/roles/:roleId', async (req, res) => {
  try {
    const result = await UserService.removeRole(req.params.id, req.params.roleId);
    res.json(result);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
