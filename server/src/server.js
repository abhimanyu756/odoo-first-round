const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');
const { startScheduler } = require('./jobs/scheduler');

async function start() {
  try {
    await prisma.$connect();
    // eslint-disable-next-line no-console
    console.log('✅ Connected to database');

    startScheduler();

    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`🚀 AssetFlow API running at http://localhost:${env.port}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();

// Graceful shutdown
async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
