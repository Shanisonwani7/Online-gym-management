const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const s = require('../validators/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../utils/http');
const { pageArgs, pageMeta, containsAny } = require('../utils/paginate');
const { expireOverdue } = require('../services/membership');

const router = express.Router();
router.use(authenticate, requireRole('ADMIN'));

const base = { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true };

async function findMember(id) {
  const member = await prisma.user.findFirst({ where: { id, role: 'MEMBER' }, select: { id: true } });
  if (!member) throw new HttpError(404, 'Member not found');
}

router.get('/', validate(s.memberList, 'query'), asyncHandler(async (req, res) => {
  const q = req.query;
  await expireOverdue();
  const where = {
    role: 'MEMBER',
    ...(q.active !== undefined ? { isActive: q.active } : {}),
    ...(q.search ? containsAny(['name', 'email', 'phone'], q.search) : {}),
  };
  const [total, data] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...pageArgs(q),
      select: {
        ...base,
        memberships: { orderBy: { endDate: 'desc' }, take: 1, select: { id: true, status: true, endDate: true, plan: { select: { name: true } } } },
        trainerAssignment: { select: { trainer: { select: { id: true, name: true } } } },
      },
    }),
  ]);
  res.json({ data, meta: pageMeta(q, total) });
}));

router.get('/:id', validate(s.params, 'params'), asyncHandler(async (req, res) => {
  await expireOverdue();
  const member = await prisma.user.findFirst({
    where: { id: req.params.id, role: 'MEMBER' },
    select: {
      ...base,
      profile: true,
      trainerAssignment: { include: { trainer: true } },
      memberships: { orderBy: { createdAt: 'desc' }, include: { plan: { select: { id: true, name: true } } } },
      workoutAssignments: { include: { workoutPlan: { select: { id: true, name: true, difficulty: true } } } },
    },
  });
  if (!member) throw new HttpError(404, 'Member not found');
  res.json(member);
}));

router.post('/', validate(s.memberCreate), asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const member = await prisma.user.create({
    data: { name, email, phone, passwordHash: await bcrypt.hash(password, 10), profile: { create: {} } },
    select: base,
  });
  res.status(201).json(member);
}));

router.put('/:id', validate(s.params, 'params'), validate(s.memberUpdate), asyncHandler(async (req, res) => {
  await findMember(req.params.id);
  const { password, ...rest } = req.body;
  const data = { ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) };
  res.json(await prisma.user.update({ where: { id: req.params.id }, data, select: base }));
}));

router.put('/:id/profile', validate(s.params, 'params'), validate(s.profile), asyncHandler(async (req, res) => {
  await findMember(req.params.id);
  const id = req.params.id;
  res.json(await prisma.memberProfile.upsert({ where: { userId: id }, create: { userId: id, ...req.body }, update: req.body }));
}));

router.put('/:id/trainer', validate(s.params, 'params'), validate(s.trainerAssign), asyncHandler(async (req, res) => {
  await findMember(req.params.id);
  const memberId = req.params.id;
  const { trainerId } = req.body;
  if (trainerId === null) {
    await prisma.trainerAssignment.deleteMany({ where: { memberId } });
    return res.json({ trainer: null });
  }
  const trainer = await prisma.trainer.findFirst({ where: { id: trainerId, isActive: true } });
  if (!trainer) throw new HttpError(404, 'Trainer not found or inactive');
  await prisma.trainerAssignment.upsert({
    where: { memberId },
    create: { memberId, trainerId },
    update: { trainerId, assignedAt: new Date() },
  });
  res.json({ trainer });
}));

router.delete('/:id', validate(s.params, 'params'), asyncHandler(async (req, res) => {
  await findMember(req.params.id);
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

module.exports = router;
