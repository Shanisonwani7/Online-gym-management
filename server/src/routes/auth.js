const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const prisma = require('../lib/prisma');
const env = require('../config/env');
const s = require('../validators/schemas');
const validate = require('../middleware/validate');
const { authenticate, signToken, toPublicUser } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../utils/http');

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false, skip: () => env.isTest });
// Compared against when the email is unknown, so timing does not reveal valid emails.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-1', 10);

router.post('/register', limiter, validate(s.register), asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, 'An account with this email already exists', [{ field: 'email', message: 'Email is already registered' }]);
  }
  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash: await bcrypt.hash(password, 10), profile: { create: {} } },
  });
  res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
}));

router.post('/login', limiter, validate(s.login), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok || !user.isActive) throw new HttpError(401, 'Invalid email or password');
  res.json({ token: signToken(user), user: toPublicUser(user) });
}));

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

router.put('/password', authenticate, validate(s.changePassword), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
    throw new HttpError(400, 'Current password is incorrect', [{ field: 'currentPassword', message: 'Incorrect password' }]);
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(req.body.newPassword, 10) } });
  res.json({ message: 'Password updated' });
}));

module.exports = router;
