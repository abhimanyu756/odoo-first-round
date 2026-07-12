const { PrismaClient } = require('@prisma/client');

// Single shared PrismaClient instance for the whole app.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
});

module.exports = prisma;
