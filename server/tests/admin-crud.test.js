const { api, bearer, resetDb, createAdmin, registerMember, prisma } = require('./helpers');

const DAY = 24 * 60 * 60 * 1000;
let admin;
const A = () => bearer(admin);

beforeAll(async () => {
  await resetDb();
  admin = await createAdmin();
});
afterAll(() => prisma.$disconnect());

describe('plans', () => {
  let plan;
  test('create, reject duplicates, update, search', async () => {
    const created = await api().post('/api/plans').set(A()).send({ name: 'Monthly', description: '30 days', durationDays: 30, price: 999 });
    expect(created.status).toBe(201);
    plan = created.body;
    expect(Number(plan.price)).toBe(999);
    expect((await api().post('/api/plans').set(A()).send({ name: 'Monthly', durationDays: 30, price: 1 })).status).toBe(409);
    expect((await api().post('/api/plans').set(A()).send({ name: 'Bad', durationDays: 0, price: 1 })).status).toBe(400);
    const updated = await api().put(`/api/plans/${plan.id}`).set(A()).send({ price: 1099 });
    expect(Number(updated.body.price)).toBe(1099);
    const found = await api().get('/api/plans?search=month').set(A());
    expect(found.body.data).toHaveLength(1);
    expect(found.body.meta.total).toBe(1);
  });

  test('a plan with memberships cannot be deleted; an unused one can', async () => {
    const { user } = await registerMember('planuser@test.local');
    await api().post('/api/memberships').set(A()).send({ userId: user.id, planId: plan.id });
    expect((await api().delete(`/api/plans/${plan.id}`).set(A())).status).toBe(409);
    const spare = await api().post('/api/plans').set(A()).send({ name: 'Spare', durationDays: 7, price: 10 });
    expect((await api().delete(`/api/plans/${spare.body.id}`).set(A())).status).toBe(204);
  });
});

describe('trainers', () => {
  test('create, duplicate email, update, filter, delete', async () => {
    const body = { name: 'Rohit Verma', email: 'rohit@test.local', specialization: 'Strength', experienceYears: 5 };
    const created = await api().post('/api/trainers').set(A()).send(body);
    expect(created.status).toBe(201);
    expect((await api().post('/api/trainers').set(A()).send(body)).status).toBe(409);
    const id = created.body.id;
    expect((await api().put(`/api/trainers/${id}`).set(A()).send({ isActive: false })).body.isActive).toBe(false);
    expect((await api().get('/api/trainers?active=false').set(A())).body.data).toHaveLength(1);
    expect((await api().get('/api/trainers?active=true').set(A())).body.data).toHaveLength(0);
    expect((await api().delete(`/api/trainers/${id}`).set(A())).status).toBe(204);
  });
});

describe('members', () => {
  let memberId;
  test('admin creates, searches and updates a member', async () => {
    const created = await api().post('/api/members').set(A()).send({ name: 'Neha Gupta', email: 'neha@test.local', password: 'Neha12345', phone: '9111111111' });
    expect(created.status).toBe(201);
    expect(created.body.passwordHash).toBeUndefined();
    memberId = created.body.id;
    const search = await api().get('/api/members?search=neha').set(A());
    expect(search.body.data.map((m) => m.id)).toContain(memberId);
    const updated = await api().put(`/api/members/${memberId}`).set(A()).send({ name: 'Neha G', phone: '' });
    expect(updated.body.name).toBe('Neha G');
    expect(updated.body.phone).toBeNull();
  });

  test('admin edits body information and assigns a trainer', async () => {
    const profile = await api().put(`/api/members/${memberId}/profile`).set(A()).send({ age: 27, heightCm: 165, weightKg: 58, goal: 'Tone up' });
    expect(profile.status).toBe(200);
    const bad = await api().put(`/api/members/${memberId}/profile`).set(A()).send({ age: 5 });
    expect(bad.status).toBe(400);
    const trainer = (await api().post('/api/trainers').set(A()).send({ name: 'Coach A', email: 'coach@test.local', specialization: 'Cardio' })).body;
    const assigned = await api().put(`/api/members/${memberId}/trainer`).set(A()).send({ trainerId: trainer.id });
    expect(assigned.status).toBe(200);
    const detail = await api().get(`/api/members/${memberId}`).set(A());
    expect(detail.body.profile.goal).toBe('Tone up');
    expect(detail.body.trainerAssignment.trainer.name).toBe('Coach A');
    const cleared = await api().put(`/api/members/${memberId}/trainer`).set(A()).send({ trainerId: null });
    expect(cleared.body.trainer).toBeNull();
  });

  test('deleting a member removes the account', async () => {
    expect((await api().delete(`/api/members/${memberId}`).set(A())).status).toBe(204);
    expect((await api().get(`/api/members/${memberId}`).set(A())).status).toBe(404);
  });
});

describe('memberships, payments and attendance', () => {
  let plan;
  let member;
  beforeAll(async () => {
    plan = (await api().post('/api/plans').set(A()).send({ name: 'Quarterly', durationDays: 90, price: 2699 })).body;
    member = (await registerMember('flow@test.local')).user;
  });

  test('attendance is refused without an active membership', async () => {
    const res = await api().post('/api/attendance/check-in').set(A()).send({ userId: member.id });
    expect(res.status).toBe(400);
  });

  test('a PENDING membership is activated by a payment', async () => {
    const pending = await api().post('/api/memberships').set(A()).send({ userId: member.id, planId: plan.id, status: 'PENDING' });
    expect(pending.status).toBe(201);
    expect(pending.body.status).toBe('PENDING');
    const bad = await api().post('/api/payments').set(A()).send({ userId: member.id, membershipId: pending.body.id, amount: 0 });
    expect(bad.status).toBe(400);
    const paid = await api().post('/api/payments').set(A()).send({ userId: member.id, membershipId: pending.body.id, amount: 2699, method: 'UPI', reference: 'TXN1' });
    expect(paid.status).toBe(201);
    expect(paid.body.membershipActivated).toBe(true);
    const list = await api().get(`/api/memberships?userId=${member.id}`).set(A());
    expect(list.body.data[0].status).toBe('ACTIVE');
    const days = (new Date(list.body.data[0].endDate) - new Date(list.body.data[0].startDate)) / DAY;
    expect(Math.round(days)).toBe(90);
  });

  test('a second ACTIVE membership for the same member is refused', async () => {
    const res = await api().post('/api/memberships').set(A()).send({ userId: member.id, planId: plan.id });
    expect(res.status).toBe(409);
  });

  test('payments can be filtered and searched', async () => {
    const byUser = await api().get(`/api/payments?userId=${member.id}`).set(A());
    expect(byUser.body.data).toHaveLength(1);
    expect((await api().get('/api/payments?search=TXN1').set(A())).body.data).toHaveLength(1);
    expect((await api().get('/api/payments?method=CASH').set(A())).body.data).toHaveLength(0);
  });

  test('check-in, duplicate check-in, check-out', async () => {
    const inRes = await api().post('/api/attendance/check-in').set(A()).send({ userId: member.id });
    expect(inRes.status).toBe(201);
    expect((await api().post('/api/attendance/check-in').set(A()).send({ userId: member.id })).status).toBe(409);
    const open = await api().get('/api/attendance?open=true').set(A());
    expect(open.body.data).toHaveLength(1);
    const out = await api().patch(`/api/attendance/${inRes.body.id}/check-out`).set(A());
    expect(out.status).toBe(200);
    expect(out.body.checkOut).toBeTruthy();
    expect((await api().patch(`/api/attendance/${inRes.body.id}/check-out`).set(A())).status).toBe(409);
  });

  test('cancelling a membership blocks new check-ins', async () => {
    const m = (await api().get(`/api/memberships?userId=${member.id}`).set(A())).body.data[0];
    const cancelled = await api().patch(`/api/memberships/${m.id}/status`).set(A()).send({ status: 'CANCELLED' });
    expect(cancelled.body.status).toBe('CANCELLED');
    expect((await api().post('/api/attendance/check-in').set(A()).send({ userId: member.id })).status).toBe(400);
  });

  test('overdue memberships are marked EXPIRED', async () => {
    const m = (await api().get(`/api/memberships?userId=${member.id}`).set(A())).body.data[0];
    await prisma.membership.update({ where: { id: m.id }, data: { status: 'ACTIVE', endDate: new Date(Date.now() - DAY) } });
    const list = await api().get(`/api/memberships?userId=${member.id}`).set(A());
    expect(list.body.data[0].status).toBe('EXPIRED');
  });
});

describe('exercises and workout plans', () => {
  test('build a workout plan, assign it to a member, and protect used exercises', async () => {
    const squat = (await api().post('/api/exercises').set(A()).send({ name: 'Squat', muscleGroup: 'Legs', difficulty: 'INTERMEDIATE' })).body;
    const plank = (await api().post('/api/exercises').set(A()).send({ name: 'Plank', muscleGroup: 'Core' })).body;
    expect((await api().post('/api/exercises').set(A()).send({ name: 'Squat', muscleGroup: 'Legs' })).status).toBe(409);
    expect((await api().get('/api/exercises?search=plan').set(A())).body.data).toHaveLength(1);

    const created = await api().post('/api/workouts').set(A()).send({
      name: 'Leg Day', goal: 'Strength', difficulty: 'BEGINNER',
      exercises: [{ exerciseId: squat.id, dayLabel: 'Day 1', sets: 4, reps: 8 }, { exerciseId: plank.id, sets: 3, reps: 30 }],
    });
    expect(created.status).toBe(201);
    expect(created.body.exercises).toHaveLength(2);
    expect(created.body.exercises[0].exercise.name).toBe('Squat');

    const missing = await api().post('/api/workouts').set(A()).send({ name: 'Broken', exercises: [{ exerciseId: 99999 }] });
    expect(missing.status).toBe(400);

    const replaced = await api().put(`/api/workouts/${created.body.id}`).set(A()).send({ exercises: [{ exerciseId: squat.id, sets: 5, reps: 5 }] });
    expect(replaced.body.exercises).toHaveLength(1);

    const member = await registerMember('lifter@test.local');
    const assign = await api().post(`/api/workouts/${created.body.id}/assign`).set(A()).send({ userId: member.user.id });
    expect(assign.status).toBe(201);
    const mine = await api().get('/api/me/workouts').set(bearer(member.token));
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].exercises[0].exercise.name).toBe('Squat');

    expect((await api().delete(`/api/exercises/${squat.id}`).set(A())).status).toBe(409);
    expect((await api().delete(`/api/workouts/${created.body.id}/assign/${member.user.id}`).set(A())).status).toBe(204);
    expect((await api().get('/api/me/workouts').set(bearer(member.token))).body.data).toHaveLength(0);
    expect((await api().delete(`/api/workouts/${created.body.id}`).set(A())).status).toBe(204);
    expect((await api().delete(`/api/exercises/${squat.id}`).set(A())).status).toBe(204);
  });
});

describe('dashboard', () => {
  test('admin dashboard returns numeric stats', async () => {
    const res = await api().get('/api/dashboard/admin').set(A());
    expect(res.status).toBe(200);
    expect(res.body.stats.totalMembers).toEqual(expect.any(Number));
    expect(res.body.stats.totalRevenue).toBeGreaterThanOrEqual(2699);
  });
});
