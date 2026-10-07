import { describe, it, expect, vi, beforeEach } from 'vitest';

const clerkVerifyMock = vi.fn();
const findOneMock = vi.fn();

vi.mock('@clerk/backend', () => ({
  verifyToken: (...args) => clerkVerifyMock(...args),
}));

vi.mock('../models/userModel.js', () => ({
  default: { findOne: (...args) => findOneMock(...args) },
}));

const { verifyToken } = await import('../controllers/authController.js');

const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const makeReq = (token = 'clerk-token') => ({
  headers: { authorization: `Bearer ${token}` },
  cookies: {},
});

const makeUser = (overrides = {}) => ({
  _id: 'user-object-id',
  userId: 'student1',
  role: 'user',
  discipline: 'medicine',
  year: 3,
  activeClerkSid: null,
  ...overrides,
});

describe('Single active device (Clerk session lock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_lock';
    process.env.DISABLE_JWT_FALLBACK = 'true'; // stay inside the Clerk branch
  });

  it('passes when the session owns the lock', async () => {
    clerkVerifyMock.mockResolvedValue({ sub: 'user_1', sid: 'sess_A' });
    findOneMock.mockResolvedValue(makeUser({ activeClerkSid: 'sess_A' }));
    const next = vi.fn();
    const req = makeReq();
    const res = makeRes();

    await verifyToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
    expect(req.clerkSid).toBe('sess_A');
    expect(req.user.userId).toBe('student1');
  });

  it('answers 409 when the session was displaced', async () => {
    clerkVerifyMock.mockResolvedValue({ sub: 'user_1', sid: 'sess_B' });
    findOneMock.mockResolvedValue(makeUser({ activeClerkSid: 'sess_A' }));
    const next = vi.fn();
    const req = makeReq();
    const res = makeRes();

    await verifyToken(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/another device/i);
    expect(req.user).toBeUndefined();
  });

  it('passes on first sync after deploy (no lock stored yet)', async () => {
    clerkVerifyMock.mockResolvedValue({ sub: 'user_1', sid: 'sess_A' });
    findOneMock.mockResolvedValue(makeUser({ activeClerkSid: null }));
    const next = vi.fn();
    const res = makeRes();

    await verifyToken(makeReq(), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('never kicks when the token carries no session id', async () => {
    clerkVerifyMock.mockResolvedValue({ sub: 'user_1' }); // e.g. a JWT template token
    findOneMock.mockResolvedValue(makeUser({ activeClerkSid: 'sess_A' }));
    const next = vi.fn();
    const res = makeRes();

    await verifyToken(makeReq(), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('keeps 401 for unknown users', async () => {
    clerkVerifyMock.mockResolvedValue({ sub: 'user_1', sid: 'sess_A' });
    findOneMock.mockResolvedValue(null);
    const next = vi.fn();
    const res = makeRes();

    await verifyToken(makeReq(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});