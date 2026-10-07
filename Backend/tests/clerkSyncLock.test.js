import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

const clerkVerifyMock = vi.fn();
const findOneMock = vi.fn();
const revokeSessionMock = vi.fn();
const getSessionListMock = vi.fn();

vi.mock('@clerk/backend', () => ({
  verifyToken: (...args) => clerkVerifyMock(...args),
}));

vi.mock('../models/userModel.js', () => ({
  default: { findOne: (...args) => findOneMock(...args) },
}));

vi.mock('../utils/clerkClient.js', () => ({
  getClerkClient: () => ({
    users: { getUser: async () => ({ emailAddresses: [{ emailAddress: 'student@test.com', verification: { status: 'verified' } }], firstName: 'Test', lastName: 'Student' }) },
    sessions: {
      revokeSession: (...args) => revokeSessionMock(...args),
      getSessionList: (...args) => getSessionListMock(...args),
    },
  }),
}));

const { default: clerkRoutes } = await import('../routes/clerkRoutes.js');

const app = express();
app.use(express.json());
app.use('/api/auth', clerkRoutes);

const sync = () =>
  request(app)
    .post('/api/auth/clerk-sync')
    .set('Authorization', 'Bearer clerk-token')
    .send({});

const makeUser = (overrides = {}) => ({
  _id: 'user-object-id',
  userId: 'student',
  clerkId: 'user_1',
  name: 'Test Student',
  email: 'student@test.com',
  emailVerified: true,
  role: 'user',
  activeTokenId: 'existing-token-id',
  activeClerkSid: null,
  isOnline: false,
  lastSeenAt: null,
  save: vi.fn(async function () { return this; }),
  ...overrides,
});

let request;

describe('clerk-sync single-device takeover', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    ({ default: request } = await import('supertest'));
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    clerkVerifyMock.mockResolvedValue({ sub: 'user_1' });
  });

  it('claims the lock on first sync without revoking anything', async () => {
    const user = makeUser();
    clerkVerifyMock.mockResolvedValue({ sub: 'user_1', sid: 'sess_A' });
    findOneMock.mockResolvedValue(user);

    const res = await sync();

    expect(res.status).toBe(200);
    expect(user.activeClerkSid).toBe('sess_A');
    expect(user.isOnline).toBe(true);
    expect(user.lastSeenAt).toBeTruthy();
    expect(revokeSessionMock).not.toHaveBeenCalled();
    expect(user.activeTokenId).toBe('existing-token-id'); // preserved for the legacy JWT path
  });

  it('does not revoke when the same device syncs again (multi-tab safe)', async () => {
    const user = makeUser({ activeClerkSid: 'sess_A', isOnline: true });
    clerkVerifyMock.mockResolvedValue({ sub: 'user_1', sid: 'sess_A' });
    findOneMock.mockResolvedValue(user);

    const res = await sync();

    expect(res.status).toBe(200);
    expect(user.activeClerkSid).toBe('sess_A');
    expect(revokeSessionMock).not.toHaveBeenCalled();
  });

  it('takes over and signs the previous device out', async () => {
    const user = makeUser({ activeClerkSid: 'sess_A' });
    clerkVerifyMock.mockResolvedValue({ sub: 'user_1', sid: 'sess_B' });
    findOneMock.mockResolvedValue(user);
    revokeSessionMock.mockResolvedValue({});

    const res = await sync();

    expect(res.status).toBe(200);
    expect(user.activeClerkSid).toBe('sess_B');
    expect(revokeSessionMock).toHaveBeenCalledWith('sess_A');
  });

  it('still claims the lock when the revoke call fails', async () => {
    const user = makeUser({ activeClerkSid: 'sess_A' });
    clerkVerifyMock.mockResolvedValue({ sub: 'user_1', sid: 'sess_B' });
    findOneMock.mockResolvedValue(user);
    revokeSessionMock.mockRejectedValue(new Error('rate limited'));

    const res = await sync();

    expect(res.status).toBe(200);
    expect(user.activeClerkSid).toBe('sess_B'); // API-level 409 still kicks the old device
  });

  it('never records a lock when the token carries no session id', async () => {
    const user = makeUser();
    clerkVerifyMock.mockResolvedValue({ sub: 'user_1' }); // no sid
    findOneMock.mockResolvedValue(user);

    const res = await sync();

    expect(res.status).toBe(200);
    expect(user.activeClerkSid).toBeNull();
    expect(revokeSessionMock).not.toHaveBeenCalled();
  });
});