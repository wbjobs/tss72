const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Multi-Tenant RLS Middleware Server`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`\n📚 API Endpoints:`);
  console.log(`  GET    /api/tenants`);
  console.log(`  POST   /api/tenants`);
  console.log(`  GET    /api/tenants/:id`);
  console.log(`  PUT    /api/tenants/:id`);
  console.log(`  DELETE /api/tenants/:id`);
  console.log(``);
  console.log(`  GET    /api/tenants/:tenantId/roles`);
  console.log(`  POST   /api/tenants/:tenantId/roles`);
  console.log(`  GET    /api/tenants/:tenantId/roles/:id`);
  console.log(`  PUT    /api/tenants/:tenantId/roles/:id`);
  console.log(`  DELETE /api/tenants/:tenantId/roles/:id`);
  console.log(``);
  console.log(`  GET    /api/tenants/:tenantId/users`);
  console.log(`  POST   /api/tenants/:tenantId/users`);
  console.log(`  GET    /api/tenants/:tenantId/users/:id`);
  console.log(`  PUT    /api/tenants/:tenantId/users/:id`);
  console.log(`  DELETE /api/tenants/:tenantId/users/:id`);
  console.log(`  POST   /api/tenants/:tenantId/users/:id/roles/:roleId`);
  console.log(`  DELETE /api/tenants/:tenantId/users/:id/roles/:roleId`);
  console.log(``);
  console.log(`  GET    /api/tenants/:tenantId/policies`);
  console.log(`  POST   /api/tenants/:tenantId/policies`);
  console.log(`  GET    /api/tenants/:tenantId/policies/:id`);
  console.log(`  PUT    /api/tenants/:tenantId/policies/:id`);
  console.log(`  PATCH  /api/tenants/:tenantId/policies/:id/enable`);
  console.log(`  PATCH  /api/tenants/:tenantId/policies/:id/disable`);
  console.log(`  DELETE /api/tenants/:tenantId/policies/:id`);
  console.log(``);
  console.log(`  POST   /api/sql/preview  (Preview SQL rewriting without execution)`);
  console.log(`  POST   /api/sql/execute  (Execute SQL with RLS applied)`);
  console.log(`\n`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = server;
