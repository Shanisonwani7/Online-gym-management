const prisma = require('../lib/prisma');
const { HttpError } = require('../utils/http');
const { addDays } = require('../utils/dates');

// Marks ACTIVE memberships whose end date has passed as EXPIRED.
async function expireOverdue(db = prisma) {
  await db.membership.updateMany({
    where: { status: 'ACTIVE', endDate: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
}

const activeNow = (userId) => ({
  userId,
  status: 'ACTIVE',
  startDate: { lte: new Date() },
  endDate: { gte: new Date() },
});

async function assertNoActive(userId, db = prisma, excludeId) {
  await expireOverdue(db);
  const existing = await db.membership.findFirst({
    where: { userId, status: 'ACTIVE', ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (existing) throw new HttpError(409, 'This member already has an active membership');
}

// membership must include its plan. The period restarts from now.
async function activate(membership, db = prisma) {
  await assertNoActive(membership.userId, db, membership.id);
  const startDate = new Date();
  return db.membership.update({
    where: { id: membership.id },
    data: { status: 'ACTIVE', startDate, endDate: addDays(startDate, membership.plan.durationDays) },
  });
}

module.exports = { expireOverdue, activeNow, assertNoActive, activate };
