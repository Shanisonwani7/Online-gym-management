// Seeds the admin account, plans, trainers, exercises, workouts and optional demo data.
// Safe to run more than once.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;

function need(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in server/.env (see .env.example)`);
  return value;
}

function assertStrong(name, value) {
  if (value.length < 8 || !/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    throw new Error(`${name} must be at least 8 characters and contain a letter and a number. Edit server/.env.`);
  }
}

async function seedAdmin() {
  const email = need('ADMIN_EMAIL').toLowerCase();
  const password = need('ADMIN_PASSWORD');
  assertStrong('ADMIN_PASSWORD', password);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: process.env.ADMIN_NAME || 'Gym Admin', email, role: 'ADMIN', passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`Admin ready: ${email}`);
}

async function seedCatalog() {
  const plans = [
    { name: 'Monthly', description: 'Full gym access for 30 days', durationDays: 30, price: 999 },
    { name: 'Quarterly', description: 'Three months, save 10%', durationDays: 90, price: 2699 },
    { name: 'Annual', description: 'Best value for a full year', durationDays: 365, price: 9999 },
  ];
  for (const p of plans) await prisma.plan.upsert({ where: { name: p.name }, update: {}, create: p });

  const trainers = [
    { name: 'Rohit Verma', email: 'rohit.verma@example.com', specialization: 'Strength and conditioning', experienceYears: 8, bio: 'Powerlifting coach focused on technique.' },
    { name: 'Anjali Mehra', email: 'anjali.mehra@example.com', specialization: 'Weight loss and cardio', experienceYears: 5, bio: 'Builds sustainable fat-loss programs.' },
    { name: 'Imran Khan', email: 'imran.khan@example.com', specialization: 'Mobility and rehab', experienceYears: 6, bio: 'Helps members train around old injuries.' },
  ];
  for (const t of trainers) await prisma.trainer.upsert({ where: { email: t.email }, update: {}, create: t });

  const exercises = [
    ['Barbell Squat', 'Legs', 'Barbell', 'INTERMEDIATE'], ['Deadlift', 'Back', 'Barbell', 'ADVANCED'],
    ['Bench Press', 'Chest', 'Barbell', 'INTERMEDIATE'], ['Push-up', 'Chest', 'Bodyweight', 'BEGINNER'],
    ['Pull-up', 'Back', 'Pull-up bar', 'INTERMEDIATE'], ['Overhead Press', 'Shoulders', 'Barbell', 'INTERMEDIATE'],
    ['Dumbbell Curl', 'Arms', 'Dumbbells', 'BEGINNER'], ['Tricep Dip', 'Arms', 'Bench', 'BEGINNER'],
    ['Plank', 'Core', 'Bodyweight', 'BEGINNER'], ['Lunge', 'Legs', 'Bodyweight', 'BEGINNER'],
    ['Lat Pulldown', 'Back', 'Cable machine', 'BEGINNER'], ['Treadmill Intervals', 'Cardio', 'Treadmill', 'BEGINNER'],
  ];
  for (const [name, muscleGroup, equipment, difficulty] of exercises) {
    await prisma.exercise.upsert({ where: { name }, update: {}, create: { name, muscleGroup, equipment, difficulty } });
  }

  const byName = Object.fromEntries((await prisma.exercise.findMany()).map((e) => [e.name, e.id]));
  const workouts = [
    {
      name: 'Beginner Full Body', goal: 'General fitness', difficulty: 'BEGINNER', description: 'Three full-body days a week.',
      rows: [['Day 1', 'Barbell Squat', 3, 8], ['Day 1', 'Push-up', 3, 10], ['Day 1', 'Plank', 3, 30],
             ['Day 2', 'Lat Pulldown', 3, 10], ['Day 2', 'Dumbbell Curl', 3, 12], ['Day 2', 'Lunge', 3, 10]],
    },
    {
      name: 'Strength Builder', goal: 'Build strength', difficulty: 'INTERMEDIATE', description: 'Heavy compound lifts, four days a week.',
      rows: [['Day 1', 'Barbell Squat', 5, 5], ['Day 1', 'Bench Press', 5, 5], ['Day 2', 'Deadlift', 4, 5],
             ['Day 2', 'Overhead Press', 4, 6], ['Day 3', 'Pull-up', 4, 8]],
    },
  ];
  for (const w of workouts) {
    const exists = await prisma.workoutPlan.findUnique({ where: { name: w.name } });
    if (exists) continue;
    await prisma.workoutPlan.create({
      data: {
        name: w.name, goal: w.goal, difficulty: w.difficulty, description: w.description,
        exercises: { create: w.rows.map(([dayLabel, ex, sets, reps], position) => ({ dayLabel, exerciseId: byName[ex], sets, reps, position })) },
      },
    });
  }
  console.log('Plans, trainers, exercises and workouts ready');
}

async function seedDemo() {
  if (process.env.SEED_DEMO_DATA !== 'true') return console.log('Demo data skipped (SEED_DEMO_DATA is not "true")');
  const password = need('SEED_DEMO_PASSWORD');
  assertStrong('SEED_DEMO_PASSWORD', password);
  const passwordHash = await bcrypt.hash(password, 10);

  const [monthly, quarterly] = await Promise.all([
    prisma.plan.findUnique({ where: { name: 'Monthly' } }),
    prisma.plan.findUnique({ where: { name: 'Quarterly' } }),
  ]);
  const trainer = await prisma.trainer.findFirst({ orderBy: { id: 'asc' } });
  const workout = await prisma.workoutPlan.findUnique({ where: { name: 'Beginner Full Body' } });
  const now = Date.now();

  const members = [
    { name: 'Aarav Sharma', email: 'aarav@example.com', phone: '9000000001', plan: monthly, startedDaysAgo: 5, status: 'ACTIVE', paid: true,
      profile: { age: 24, gender: 'Male', heightCm: 175, weightKg: 72, bodyFatPercent: 18, goal: 'Build muscle' } },
    { name: 'Diya Patel', email: 'diya@example.com', phone: '9000000002', plan: quarterly, startedDaysAgo: 100, status: 'EXPIRED', paid: true,
      profile: { age: 29, gender: 'Female', heightCm: 162, weightKg: 60, goal: 'Lose weight' } },
    { name: 'Kabir Singh', email: 'kabir@example.com', phone: '9000000003', plan: monthly, startedDaysAgo: 0, status: 'PENDING', paid: false,
      profile: { age: 31, gender: 'Male', heightCm: 180, weightKg: 85, goal: 'Improve stamina' } },
  ];

  for (const m of members) {
    if (await prisma.user.findUnique({ where: { email: m.email } })) continue;
    const start = new Date(now - m.startedDaysAgo * DAY);
    const user = await prisma.user.create({
      data: { name: m.name, email: m.email, phone: m.phone, passwordHash, profile: { create: m.profile } },
    });
    const membership = await prisma.membership.create({
      data: { userId: user.id, planId: m.plan.id, status: m.status, startDate: start, endDate: new Date(start.getTime() + m.plan.durationDays * DAY) },
    });
    if (m.paid) {
      await prisma.payment.create({
        data: { userId: user.id, membershipId: membership.id, amount: m.plan.price, method: 'UPI', reference: `DEMO-${user.id}`, paidAt: start },
      });
    }
    if (m.status === 'ACTIVE') {
      await prisma.trainerAssignment.create({ data: { memberId: user.id, trainerId: trainer.id } });
      await prisma.memberWorkout.create({ data: { userId: user.id, workoutPlanId: workout.id } });
      for (const d of [1, 2, 4]) {
        const checkIn = new Date(now - d * DAY);
        await prisma.attendance.create({ data: { userId: user.id, checkIn, checkOut: new Date(checkIn.getTime() + 75 * 60 * 1000) } });
      }
    }
  }
  console.log('Demo members ready: aarav@example.com, diya@example.com, kabir@example.com');
}

seedAdmin()
  .then(seedCatalog)
  .then(seedDemo)
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
