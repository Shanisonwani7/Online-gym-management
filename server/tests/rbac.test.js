const { api, bearer, resetDb, createAdmin, registerMember, prisma } = require('./helpers');

let admin;
let member;

beforeAll(async () => {
  await resetDb();
  admin = await createAdmin();
  member = (await registerMember()).token;
});
afterAll(() => prisma.$disconnect());

describe('role-based access', () => {
  test('unauthenticated requests get 401 on protected routes', async () => {
    for (const path of ['/api/members', '/api/trainers', '/api/payments', '/api/me/profile', '/api/dashboard/admin']) {
      expect((await api().get(path)).status).toBe(401);
    }
  });

  test('members get 403 on admin routes', async () => {
    for (const path of ['/api/members', '/api/trainers', '/api/memberships', '/api/payments', '/api/attendance', '/api/workouts', '/api/dashboard/admin']) {
      expect((await api().get(path).set(bearer(member))).status).toBe(403);
    }
    const create = await api().post('/api/plans').set(bearer(member)).send({ name: 'Hack', durationDays: 30, price: 1 });
    expect(create.status).toBe(403);
  });

  test('admins can reach admin routes', async () => {
    for (const path of ['/api/members', '/api/trainers', '/api/memberships', '/api/payments', '/api/attendance', '/api/workouts', '/api/dashboard/admin']) {
      expect((await api().get(path).set(bearer(admin))).status).toBe(200);
    }
  });

  test('admins are not members: /api/me/* is member-only', async () => {
    expect((await api().get('/api/me/profile').set(bearer(admin))).status).toBe(403);
    expect((await api().get('/api/dashboard/member').set(bearer(admin))).status).toBe(403);
  });

  test('members can reach member routes', async () => {
    expect((await api().get('/api/me/profile').set(bearer(member))).status).toBe(200);
    expect((await api().get('/api/dashboard/member').set(bearer(member))).status).toBe(200);
  });

  test('plans are public, but inactive plans are hidden from non-admins', async () => {
    await prisma.plan.createMany({ data: [
      { name: 'Visible', durationDays: 30, price: 100, isActive: true },
      { name: 'Hidden', durationDays: 30, price: 100, isActive: false },
    ] });
    const publicList = await api().get('/api/plans');
    expect(publicList.status).toBe(200);
    expect(publicList.body.data.map((p) => p.name)).toEqual(['Visible']);
    const adminList = await api().get('/api/plans').set(bearer(admin));
    expect(adminList.body.data.map((p) => p.name).sort()).toEqual(['Hidden', 'Visible']);
  });

  test('unknown routes return a JSON 404', async () => {
    const res = await api().get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.message).toEqual(expect.any(String));
  });
});
