const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const env = require('../config/env');
const { HttpError } = require('../utils/http');

const toPublicUser = (user) => {
  const { passwordHash, ...rest } = user;
  return rest;
};

const signToken = (user) =>
  jwt.sign({ role: user.role }, env.jwtSecret, { subject: String(user.id), expiresIn: env.jwtExpiresIn });

async function loadUser(req, required) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    if (required) throw new HttpError(401, 'Authentication required');
    return;
  }
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    if (required) throw new HttpError(401, 'Invalid or expired token');
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
  if (!user || !user.isActive) {
    if (required) throw new HttpError(401, 'Account not found or disabled');
    return;
  }
  req.user = toPublicUser(user);
}

const authenticate = (req, res, next) => loadUser(req, true).then(() => next(), next);
const optionalAuth = (req, res, next) => loadUser(req, false).then(() => next(), next);

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user && req.user.role)
    ? next()
    : next(new HttpError(403, 'You do not have permission to perform this action'));

module.exports = { authenticate, optionalAuth, requireRole, signToken, toPublicUser };
