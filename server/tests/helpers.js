const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const TABLES = [
  'MemberWorkout', 'WorkoutPlanExercise', 'WorkoutPlan', 'Exercise', 'Attendance', 'Payment',
  'Membership', 'Plan', 'TrainerAssignment', 'Trainer', 'MemberProfile', 'User',
];

// Refuses to wipe anything but a database whose name contains "test".
async function resetDb() {
  const dbName = (process.env.DATABASE_URL || '').split('?')[0].split('/').pop();
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to reset database "${dbName}". Tests must use a database with "test" in its name (server/.env.test).`);
  }
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

const api = () => request(app);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

async function createAdmin(email = 'admin@test.local', password = 'Admin12345') {
  await prisma.user.create({
    data: { name: 'Test Admin', email, role: 'ADMIN', passwordHash: await bcrypt.hash(password, 4) },
  });
  return loginAs(email, password);
}

async function loginAs(email, password) {
  const res = await api().post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token;
}

async function registerMember(email = 'member@test.local', password = 'Member12345', name = 'Test Member') {
  const res = await api().post('/api/auth/register').send({ name, email, password });
  if (res.status !== 201) throw new Error(`Register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user };
}

module.exports = { api, bearer, resetDb, createAdmin, loginAs, registerMember, prisma };
