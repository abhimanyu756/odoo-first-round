const multer = require('multer');
const { Prisma } = require('@prisma/client');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

// 404 for unmatched routes.
function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler. Normalizes ApiError, zod, multer, and Prisma errors.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }

  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : err.message;
    return res.status(400).json({ error: msg });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.join?.(', ') || 'field';
      return res.status(409).json({ error: `A record with this ${field} already exists` });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid reference to a related record' });
    }
  }

  // eslint-disable-next-line no-console
  console.error('[unhandled error]', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(env.isProd ? {} : { message: err.message, stack: err.stack }),
  });
}

module.exports = { notFoundHandler, errorHandler };
