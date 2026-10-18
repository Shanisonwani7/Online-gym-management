const express = require('express');
const prisma = require('../lib/prisma');
const s = require('../validators/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../utils/http');
const { pageArgs, pageMeta } = require('../utils/paginate');
const { addDays } = require('../utils/dates');
const attendance = require('../services/attendance');

const router = express.Router();
router.use(authenticate, requireRole('ADMIN'));

const include = { user: { select: { id: true, name: true, email: true } } };

router.get('/', validate(s.attendanceList, 'query'), asyncHandler(async (req, res) => {
  const q = req.query;
  const where = {
    ...(q.userId ? { userId: q.userId } : {}),
    ...(q.open !== undefined ? { checkOut: q.open ? null : { not: null } } : {}),
    ...(q.from || q.to ? { checkIn: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lt: addDays(q.to, 1) } : {}) } } : {}),
  };
  const [total, data] = await prisma.$transaction([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({ where, orderBy: { checkIn: 'desc' }, ...pageArgs(q), include }),
  ]);
  res.json({ data, meta: pageMeta(q, total) });
}));

router.post('/check-in', validate(s.attendanceCheckIn), asyncHandler(async (req, res) => {
  const member = await prisma.user.findFirst({ where: { id: req.body.userId, role: 'MEMBER', isActive: true } });
  if (!member) throw new HttpError(404, 'Member not found or inactive');
  const record = await attendance.checkIn(member.id);
  res.status(201).json({ ...record, user: { id: member.id, name: member.name, email: member.email } });
}));

router.patch('/:id/check-out', validate(s.params, 'params'), asyncHandler(async (req, res) => {
  const record = await prisma.attendance.findUnique({ where: { id: req.params.id } });
  if (!record) throw new HttpError(404, 'Attendance record not found');
  if (record.checkOut) throw new HttpError(409, 'Already checked out');
  res.json(await prisma.attendance.update({ where: { id: record.id }, data: { checkOut: new Date() }, include }));
}));

router.delete('/:id', validate(s.params, 'params'), asyncHandler(async (req, res) => {
  await prisma.attendance.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

module.exports = router;
