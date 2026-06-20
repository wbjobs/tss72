const User = require('../models/user.model');

function authContext(req, res, next) {
  const userId = req.headers['x-user-id'];
  const tenantId = req.headers['x-tenant-id'];
  const bypassRls = req.headers['x-bypass-rls'] === 'true';

  if (userId) {
    req.user = {
      id: userId,
      tenantId: tenantId,
      bypassRls: bypassRls,
    };
  }

  next();
}

async function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required. Provide X-User-Id header.' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'Invalid user ID' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'User account is disabled' });
    }
    req.user.tenantId = user.tenant_id;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  authContext,
  requireAuth,
};
