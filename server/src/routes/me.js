const express = require('express');
const prisma = require('../lib/prisma');
const s = require('../validators/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../utils/http');
const { pageArgs, pageMeta } = require('../utils/paginate');
const { addDays } = require('../utils/dates');
const { expireOverdue } = require('../services/membership');
const attendance = require('../services/attendance');

const router = express.Router();
router.use(authenticate, requireRole('MEMBER'));

router.get('/profile', asyncHandler(async (req, res) => {
  const profile = await prisma.memberProfile.findUnique({ where: { userId: req.user.id } });
  res.json({ user: req.user, profile: profile || {} });
}));

router.put('/profile', validate(s.selfProfile), asyncHandler(async (req, res) => {
  const { name, phone, ...profile } = req.body;
  const userId = req.user.id;
  const [user, saved] = await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { name, phone }, select: { id: true, name: true, email: true, phone: true, role: true, isActive: true } }),
    prisma.memberProfile.upsert({ where: { userId }, create: { userId, ...profile }, update: profile }),
  ]);
  res.json({ user, profile: saved });
}));

router.get('/trainer', asyncHandler(async (req, res) => {
  const assignment = await prisma.trainerAssignment.findUnique({ where: { memberId: req.user.id }, include: { trainer: true } });
  res.json({ trainer: assignment ? assignment.trainer : null });
}));

router.get('/memberships', asyncHandler(async (req, res) => {
  await expireOverdue();
  const data = await prisma.membership.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: { plan: { select: { id: true, name: true, price: true, durationDays: true } } },
  });
  res.json({ data });
}));

// Member requests a plan; an admin activates it once payment is recorded.
router.post('/memberships', validate(s.subscribe), asyncHandler(async (req, res) => {
  await expireOverdue();
  const userId = req.user.id;
  const plan = await prisma.plan.findFirst({ where: { id: req.body.planId, isActive: true } });
  if (!plan) throw new HttpError(404, 'Plan not found or inactive');
  const open = await prisma.membership.findFirst({ where: { userId, status: { in: ['ACTIVE', 'PENDING'] } } });
  if (open) {
    throw new HttpError(409, open.status === 'ACTIVE' ? 'You already have an active membership' : 'You already have a pending request');
  }
  const startDate = new Date();
  const membership = await prisma.membership.create({
    data: { userId, planId: plan.id, status: 'PENDING', startDate, endDate: addDays(startDate, plan.durationDays) },
    include: { plan: { select: { id: true, name: true, price: true, durationDays: true } } },
  });
  res.status(201).json(membership);
}));

router.get('/payments', validate(s.pageOnly, 'query'), asyncHandler(async (req, res) => {
  const q = req.query;
  const where = { userId: req.user.id };
  const [total, data] = await prisma.$transaction([
    prisma.payment.count({ where }),
    prisma.payment.findMany({ where, orderBy: { paidAt: 'desc' }, ...pageArgs(q), include: { membership: { select: { plan: { select: { name: true } } } } } }),
  ]);
  res.json({ data, meta: pageMeta(q, total) });
}));

router.get('/attendance', validate(s.pageOnly, 'query'), asyncHandler(async (req, res) => {
  const q = req.query;
  const where = { userId: req.user.id };
  const [total, data, open] = await prisma.$transaction([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({ where, orderBy: { checkIn: 'desc' }, ...pageArgs(q) }),
    prisma.attendance.findFirst({ where: { userId: req.user.id, checkOut: null } }),
  ]);
  res.json({ data, meta: pageMeta(q, total), open });
}));

router.post('/attendance/check-in', asyncHandler(async (req, res) => {
  res.status(201).json(await attendance.checkIn(req.user.id));
}));

router.post('/attendance/check-out', asyncHandler(async (req, res) => {
  res.json(await attendance.checkOut(req.user.id));
}));

router.get('/workouts', asyncHandler(async (req, res) => {
  const assignments = await prisma.memberWorkout.findMany({
    where: { userId: req.user.id },
    orderBy: { assignedAt: 'desc' },
    include: { workoutPlan: { include: { exercises: { orderBy: { position: 'asc' }, include: { exercise: true } } } } },
  });
  res.json({ data: assignments.map((a) => ({ ...a.workoutPlan, assignedAt: a.assignedAt })) });
}));

module.exports = router;
