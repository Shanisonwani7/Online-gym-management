const prisma = require('../lib/prisma');
const { HttpError } = require('../utils/http');
const { expireOverdue, activeNow } = require('./membership');

async function checkIn(userId) {
  await expireOverdue();
  const active = await prisma.membership.findFirst({ where: activeNow(userId) });
  if (!active) throw new HttpError(400, 'No active membership. Attendance cannot be recorded.');
  const open = await prisma.attendance.findFirst({ where: { userId, checkOut: null } });
  if (open) throw new HttpError(409, 'Already checked in. Check out first.');
  return prisma.attendance.create({ data: { userId } });
}

async function checkOut(userId) {
  const open = await prisma.attendance.findFirst({ where: { userId, checkOut: null }, orderBy: { checkIn: 'desc' } });
  if (!open) throw new HttpError(400, 'No open check-in to close');
  return prisma.attendance.update({ where: { id: open.id }, data: { checkOut: new Date() } });
}

module.exports = { checkIn, checkOut };
