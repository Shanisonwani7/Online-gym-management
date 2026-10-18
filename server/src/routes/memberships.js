const express = require('express');
const prisma = require('../lib/prisma');
const s = require('../validators/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../utils/http');
const { pageArgs, pageMeta } = require('../utils/paginate');
const { addDays } = require('../utils/dates');
const { expireOverdue, assertNoActive, activate } = require('../services/membership');

const router = express.Router();
router.use(authenticate, requireRole('ADMIN'));

const include = { user: { select: { id: true, name: true, email: true } }, plan: { select: { id: true, name: true, price: true } } };

router.get('/', validate(s.membershipList, 'query'), asyncHandler(async (req, res) => {
  const q = req.query;
  await expireOverdue();
  const where = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.userId ? { userId: q.userId } : {}),
    ...(q.planId ? { planId: q.planId } : {}),
  };
  const [total, data] = await prisma.$transaction([
    prisma.membership.count({ where }),
    prisma.membership.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q), include }),
  ]);
  res.json({ data, meta: pageMeta(q, total) });
}));

router.post('/', validate(s.membershipCreate), asyncHandler(async (req, res) => {
  const { userId, planId, startDate, status } = req.body;
  const member = await prisma.user.findFirst({ where: { id: userId, role: 'MEMBER', isActive: true } });
  if (!member) throw new HttpError(404, 'Member not found or inactive');
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw new HttpError(404, 'Plan not found or inactive');
  if (status === 'ACTIVE') await assertNoActive(userId);
  const start = startDate || new Date();
  const membership = await prisma.membership.create({
    data: { userId, planId, status, startDate: start, endDate: addDays(start, plan.durationDays) },
    include,
  });
  res.status(201).json(membership);
}));

router.patch('/:id/status', validate(s.params, 'params'), validate(s.membershipStatus), asyncHandler(async (req, res) => {
  const membership = await prisma.membership.findUnique({ where: { id: req.params.id }, include: { plan: true } });
  if (!membership) throw new HttpError(404, 'Membership not found');
  const { status } = req.body;
  let updated;
  if (status === 'CANCELLED') {
    updated = await prisma.membership.update({ where: { id: membership.id }, data: { status } });
  } else if (membership.status === 'ACTIVE') {
    updated = membership;
  } else {
    updated = await activate(membership);
  }
  res.json(updated);
}));

router.delete('/:id', validate(s.params, 'params'), asyncHandler(async (req, res) => {
  await prisma.membership.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

module.exports = router;
