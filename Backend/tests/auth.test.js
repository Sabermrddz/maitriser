import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

const post = (url, body) =>
  request(app).post(url).set('Origin', 'http://localhost:5173').send(body);
const put = (url, body) =>
  request(app).put(url).set('Origin', 'http://localhost:5173').send(body);

describe('Auth validation', () => {
  it('rejects missing fields on register', async () => {
    const res = await post('/api/users/register', {});
    expect(res.status).toBe(400);
  });

  it('rejects weak password on register', async () => {
    const res = await post('/api/users/register', {
      name: 'Test', email: 'test@test.com', password: 'short',
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing fields on login', async () => {
    const res = await post('/api/users/login', {});
    expect(res.status).toBe(400);
  });

  it('rejects change-password without token', async () => {
    const res = await put('/api/users/change-password', {
      currentPassword: 'old', newPassword: 'NewPass123!',
    });
    expect(res.status).toBe(401);
  });

  it('rejects change-password via legacy alias without token', async () => {
    const res = await put('/api/change-password', {
      currentPassword: 'old', newPassword: 'NewPass123!',
    });
    expect(res.status).toBe(401);
  });
});
