const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const { addDays, DAY_MS } = require('../utils/dates');
const { expireOverdue, activeNow } = require('../services/membership');

const router = express.Router();
router.use(authenticate);

const sum = (agg) => Number(agg._sum.amount || 0);

router.get('/admin', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  await expireOverdue();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalMembers, activeMemberships, pendingMemberships, trainers, checkInsToday, inGymNow,
    monthRevenue, totalRevenue, expiringSoon, recentPayments, recentAttendance] = await Promise.all([
    prisma.user.count({ where: { role: 'MEMBER' } }),
    prisma.membership.count({ where: { status: 'ACTIVE' } }),
    prisma.membership.count({ where: { status: 'PENDING' } }),
    prisma.trainer.count({ where: { isActive: true } }),
    prisma.attendance.count({ where: { checkIn: { gte: dayStart } } }),
    prisma.attendance.count({ where: { checkOut: null } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: monthStart } } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.membership.findMany({
      where: { status: 'ACTIVE', endDate: { lte: addDays(now, 7) } },
      orderBy: { endDate: 'asc' },
      take: 5,
      include: { user: { select: { id: true, name: true } }, plan: { select: { name: true } } },
    }),
    prisma.payment.findMany({ orderBy: { paidAt: 'desc' }, take: 5, include: { user: { select: { id: true, name: true } } } }),
    prisma.attendance.findMany({ orderBy: { checkIn: 'desc' }, take: 5, include: { user: { select: { id: true, name: true } } } }),
  ]);

  res.json({
    stats: { totalMembers, activeMemberships, pendingMemberships, trainers, checkInsToday, inGymNow, monthRevenue: sum(monthRevenue), totalRevenue: sum(totalRevenue) },
    expiringSoon,
    recentPayments,
    recentAttendance,
  });
}));

router.get('/member', requireRole('MEMBER'), asyncHandler(async (req, res) => {
  await expireOverdue();
  const userId = req.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [membership, pending, assignment, workouts, visitsThisMonth, openVisit, recentAttendance, lastPayment] = await Promise.all([
    prisma.membership.findFirst({ where: activeNow(userId), orderBy: { endDate: 'desc' }, include: { plan: { select: { name: true, durationDays: true } } } }),
    prisma.membership.findFirst({ where: { userId, status: 'PENDING' }, include: { plan: { select: { name: true } } } }),
    prisma.trainerAssignment.findUnique({ where: { memberId: userId }, include: { trainer: true } }),
    prisma.memberWorkout.count({ where: { userId } }),
    prisma.attendance.count({ where: { userId, checkIn: { gte: monthStart } } }),
    prisma.attendance.findFirst({ where: { userId, checkOut: null } }),
    prisma.attendance.findMany({ where: { userId }, orderBy: { checkIn: 'desc' }, take: 5 }),
    prisma.payment.findFirst({ where: { userId }, orderBy: { paidAt: 'desc' } }),
  ]);

  res.json({
    membership: membership ? { ...membership, daysLeft: Math.max(0, Math.ceil((membership.endDate - now) / DAY_MS)) } : null,
    pendingMembership: pending,
    trainer: assignment ? assignment.trainer : null,
    stats: { workouts, visitsThisMonth },
    checkedIn: Boolean(openVisit),
    recentAttendance,
    lastPayment,
  });
}));

module.exports = router;
