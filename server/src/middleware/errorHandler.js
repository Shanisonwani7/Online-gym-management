const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');
const { HttpError } = require('../utils/http');
const env = require('../config/env');

const notFound = (req, res, next) => next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return res.status(400).json({ message: errors[0] ? errors[0].message : 'Validation failed', errors });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta && err.meta.target) || [];
      const field = Array.isArray(target) ? target[0] : String(target);
      return res.status(409).json({ message: 'That value is already in use', errors: field ? [{ field, message: 'Already in use' }] : [] });
    }
    if (err.code === 'P2025') return res.status(404).json({ message: 'Record not found' });
    if (err.code === 'P2003') return res.status(409).json({ message: 'This record is linked to other data and cannot be changed or removed' });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON in request body' });

  const status = err.status || 500;
  if (status >= 500 && !env.isTest) console.error(err);
  res.status(status).json({
    message: status >= 500 ? 'Internal server error' : err.message,
    ...(err.errors ? { errors: err.errors } : {}),
  });
}

module.exports = { notFound, errorHandler };
