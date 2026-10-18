const express = require('express');
const prisma = require('../lib/prisma');
const s = require('../validators/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../utils/http');
const { pageArgs, pageMeta } = require('../utils/paginate');
const { addDays } = require('../utils/dates');
const { activate } = require('../services/membership');

const router = express.Router();
router.use(authenticate, requireRole('ADMIN'));

const include = {
  user: { select: { id: true, name: true, email: true } },
  membership: { select: { id: true, status: true, plan: { select: { name: true } } } },
};

router.get('/', validate(s.paymentList, 'query'), asyncHandler(async (req, res) => {
  const q = req.query;
  const where = {
    ...(q.userId ? { userId: q.userId } : {}),
    ...(q.method ? { method: q.method } : {}),
    ...(q.from || q.to ? { paidAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lt: addDays(q.to, 1) } : {}) } } : {}),
    ...(q.search ? {
      OR: [
        { reference: { contains: q.search, mode: 'insensitive' } },
        { user: { name: { contains: q.search, mode: 'insensitive' } } },
        { user: { email: { contains: q.search, mode: 'insensitive' } } },
      ],
    } : {}),
  };
  const [total, data] = await prisma.$transaction([
    prisma.payment.count({ where }),
    prisma.payment.findMany({ where, orderBy: { paidAt: 'desc' }, ...pageArgs(q), include }),
  ]);
  res.json({ data, meta: pageMeta(q, total) });
}));

router.post('/', validate(s.paymentCreate), asyncHandler(async (req, res) => {
  const { userId, membershipId, amount, method, reference, note, paidAt } = req.body;
  const member = await prisma.user.findFirst({ where: { id: userId, role: 'MEMBER' } });
  if (!member) throw new HttpError(404, 'Member not found');

  const payment = await prisma.$transaction(async (tx) => {
    let membership = null;
    if (membershipId) {
      membership = await tx.membership.findFirst({ where: { id: membershipId, userId }, include: { plan: true } });
      if (!membership) throw new HttpError(404, 'Membership not found for this member');
    }
    const created = await tx.payment.create({
      data: { userId, membershipId: membershipId || null, amount, method, reference, note, ...(paidAt ? { paidAt } : {}) },
      include,
    });
    // Paying for a pending request activates it.
    if (membership && membership.status === 'PENDING') {
      await activate(membership, tx);
      return { ...created, membershipActivated: true };
    }
    return { ...created, membershipActivated: false };
  });
  res.status(201).json(payment);
}));

router.delete('/:id', validate(s.params, 'params'), asyncHandler(async (req, res) => {
  await prisma.payment.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

module.exports = router;
