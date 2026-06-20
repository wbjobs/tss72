require('dotenv').config();
const express = require('express');
const { authContext, requireAuth } = require('./middleware/auth');

const tenantsRoutes = require('./routes/tenants.routes');
const rolesRoutes = require('./routes/roles.routes');
const usersRoutes = require('./routes/users.routes');
const rlsPoliciesRoutes = require('./routes/rlsPolicies.routes');
const sqlRoutes = require('./routes/sql.routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(authContext);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api/tenants', tenantsRoutes);
app.use('/api/tenants/:tenantId/roles', rolesRoutes);
app.use('/api/tenants/:tenantId/users', usersRoutes);
app.use('/api/tenants/:tenantId/policies', rlsPoliciesRoutes);
app.use('/api/policies', rlsPoliciesRoutes);
app.use('/api/sql', sqlRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

module.exports = app;
