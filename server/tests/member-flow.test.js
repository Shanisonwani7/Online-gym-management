const { api, bearer, resetDb, createAdmin, registerMember, prisma } = require('./helpers');

let admin;
let member;
let plan;
const A = () => bearer(admin);
const M = () => bearer(member.token);

beforeAll(async () => {
  await resetDb();
  admin = await createAdmin();
  plan = (await api().post('/api/plans').set(A()).send({ name: 'Monthly', durationDays: 30, price: 999 })).body;
  member = await registerMember('flow2@test.local');
});
afterAll(() => prisma.$disconnect());

describe('member self-service', () => {
  test('profile and body information can be read and updated', async () => {
    const before = await api().get('/api/me/profile').set(M());
    expect(before.status).toBe(200);
    const res = await api().put('/api/me/profile').set(M()).send({ name: 'Flow Member', age: 30, heightCm: 178, weightKg: 80, goal: 'Run a 10k' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Flow Member');
    const after = await api().get('/api/me/profile').set(M());
    expect(after.body.profile).toMatchObject({ age: 30, heightCm: 178, goal: 'Run a 10k' });
    expect((await api().put('/api/me/profile').set(M()).send({ weightKg: 5 })).status).toBe(400);
  });

  test('no trainer until one is assigned', async () => {
    expect((await api().get('/api/me/trainer').set(M())).body.trainer).toBeNull();
    const trainer = (await api().post('/api/trainers').set(A()).send({ name: 'Coach B', email: 'coachb@test.local', specialization: 'HIIT' })).body;
    await api().put(`/api/members/${member.user.id}/trainer`).set(A()).send({ trainerId: trainer.id });
    expect((await api().get('/api/me/trainer').set(M())).body.trainer.name).toBe('Coach B');
  });

  test('subscribing creates a pending request; duplicates are refused', async () => {
    const res = await api().post('/api/me/memberships').set(M()).send({ planId: plan.id });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect((await api().post('/api/me/memberships').set(M()).send({ planId: plan.id })).status).toBe(409);
    const dash = await api().get('/api/dashboard/member').set(M());
    expect(dash.body.membership).toBeNull();
    expect(dash.body.pendingMembership.plan.name).toBe('Monthly');
  });

  test('check-in is refused until the membership is active', async () => {
    expect((await api().post('/api/me/attendance/check-in').set(M())).status).toBe(400);
  });

  test('admin records payment, membership activates, member can check in and out', async () => {
    const pending = (await api().get('/api/me/memberships').set(M())).body.data[0];
    const paid = await api().post('/api/payments').set(A()).send({ userId: member.user.id, membershipId: pending.id, amount: 999, method: 'CASH' });
    expect(paid.status).toBe(201);

    const dash = await api().get('/api/dashboard/member').set(M());
    expect(dash.body.membership.status).toBe('ACTIVE');
    expect(dash.body.membership.daysLeft).toBeGreaterThanOrEqual(29);

    const checkIn = await api().post('/api/me/attendance/check-in').set(M());
    expect(checkIn.status).toBe(201);
    expect((await api().post('/api/me/attendance/check-in').set(M())).status).toBe(409);
    const history = await api().get('/api/me/attendance').set(M());
    expect(history.body.data).toHaveLength(1);
    expect(history.body.open).toBeTruthy();
    const checkOut = await api().post('/api/me/attendance/check-out').set(M());
    expect(checkOut.status).toBe(200);
    expect((await api().post('/api/me/attendance/check-out').set(M())).status).toBe(400);
  });

  test('member sees own payments only', async () => {
    const other = await registerMember('other@test.local');
    const mine = await api().get('/api/me/payments').set(M());
    expect(mine.body.data).toHaveLength(1);
    expect(Number(mine.body.data[0].amount)).toBe(999);
    const theirs = await api().get('/api/me/payments').set(bearer(other.token));
    expect(theirs.body.data).toHaveLength(0);
  });
});
