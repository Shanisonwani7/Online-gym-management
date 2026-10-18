const { api, bearer, resetDb, registerMember, prisma } = require('./helpers');

beforeAll(resetDb);
afterAll(() => prisma.$disconnect());

describe('registration', () => {
  test('creates a MEMBER account and returns a token without the password hash', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Asha Rao', email: 'Asha@Test.Local', password: 'Secret123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Asha Rao', email: 'asha@test.local', role: 'MEMBER' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('stores a hashed password, not the plain one', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'asha@test.local' } });
    expect(user.passwordHash).not.toContain('Secret123');
    expect(user.passwordHash.startsWith('$2')).toBe(true);
  });

  test('rejects a duplicate email with 409', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Asha Two', email: 'asha@test.local', password: 'Secret123' });
    expect(res.status).toBe(409);
  });

  test('rejects a weak password with a field error', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Weak Pw', email: 'weak@test.local', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });

  test('rejects an invalid email', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Bad Mail', email: 'not-an-email', password: 'Secret123' });
    expect(res.status).toBe(400);
  });

  test('cannot self-register as ADMIN', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Sneaky', email: 'sneaky@test.local', password: 'Secret123', role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('MEMBER');
  });
});

describe('login and session', () => {
  test('logs in with correct credentials', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'asha@test.local', password: 'Secret123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  test('rejects a wrong password and an unknown email with the same 401 message', async () => {
    const wrong = await api().post('/api/auth/login').send({ email: 'asha@test.local', password: 'Wrong12345' });
    const unknown = await api().post('/api/auth/login').send({ email: 'nobody@test.local', password: 'Secret123' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  test('GET /auth/me needs a valid token', async () => {
    const { token } = await registerMember('me@test.local');
    const ok = await api().get('/api/auth/me').set(bearer(token));
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe('me@test.local');
    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/auth/me').set(bearer('garbage'))).status).toBe(401);
  });

  test('disabled accounts cannot log in or use an old token', async () => {
    const { token, user } = await registerMember('disabled@test.local');
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    expect((await api().get('/api/auth/me').set(bearer(token))).status).toBe(401);
    const res = await api().post('/api/auth/login').send({ email: 'disabled@test.local', password: 'Member12345' });
    expect(res.status).toBe(401);
  });
});

describe('change password', () => {
  test('requires the current password, then accepts the new one', async () => {
    const { token } = await registerMember('pw@test.local', 'OldPass123');
    const bad = await api().put('/api/auth/password').set(bearer(token)).send({ currentPassword: 'Nope12345', newPassword: 'NewPass123' });
    expect(bad.status).toBe(400);
    const ok = await api().put('/api/auth/password').set(bearer(token)).send({ currentPassword: 'OldPass123', newPassword: 'NewPass123' });
    expect(ok.status).toBe(200);
    const login = await api().post('/api/auth/login').send({ email: 'pw@test.local', password: 'NewPass123' });
    expect(login.status).toBe(200);
  });
});
