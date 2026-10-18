const express = require('express');
const prisma = require('../lib/prisma');
const s = require('../validators/schemas');
const validate = require('../middleware/validate');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../utils/http');
const { pageArgs, pageMeta, containsAny } = require('../utils/paginate');

const router = express.Router();

// Public: visitors and members only see active plans.
router.get('/', optionalAuth, validate(s.planList, 'query'), asyncHandler(async (req, res) => {
  const q = req.query;
  const isAdmin = req.user && req.user.role === 'ADMIN';
  const where = {
    ...(isAdmin ? (q.active !== undefined ? { isActive: q.active } : {}) : { isActive: true }),
    ...(q.search ? containsAny(['name', 'description'], q.search) : {}),
  };
  const [total, data] = await prisma.$transaction([
    prisma.plan.count({ where }),
    prisma.plan.findMany({ where, orderBy: { durationDays: 'asc' }, ...pageArgs(q), include: { _count: { select: { memberships: true } } } }),
  ]);
  res.json({ data, meta: pageMeta(q, total) });
}));

router.use(authenticate, requireRole('ADMIN'));

router.post('/', validate(s.planCreate), asyncHandler(async (req, res) => {
  res.status(201).json(await prisma.plan.create({ data: req.body }));
}));

router.put('/:id', validate(s.params, 'params'), validate(s.planUpdate), asyncHandler(async (req, res) => {
  res.json(await prisma.plan.update({ where: { id: req.params.id }, data: req.body }));
}));

router.delete('/:id', validate(s.params, 'params'), asyncHandler(async (req, res) => {
  const used = await prisma.membership.count({ where: { planId: req.params.id } });
  if (used > 0) throw new HttpError(409, 'This plan has memberships. Deactivate it instead of deleting.');
  await prisma.plan.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

module.exports = router;
