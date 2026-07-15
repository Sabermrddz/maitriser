import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

const get = (url) => request(app).get(url);
const post = (url, body) => request(app).post(url).set('Origin', 'http://localhost:5173').send(body);
const del = (url) => request(app).delete(url).set('Origin', 'http://localhost:5173');
const put = (url, body) => request(app).put(url).set('Origin', 'http://localhost:5173').send(body);

describe('Quiz access', () => {
  it('returns 401 without token for GET /api/quizzes', async () => {
    const res = await get('/api/quizzes');
    expect(res.status).toBe(401);
  });

  it('returns 401 without token for POST /api/quizzes', async () => {
    const res = await post('/api/quizzes', {});
    expect(res.status).toBe(401);
  });

  it('returns 401 without token for PUT /api/quizzes/:id', async () => {
    const res = await put('/api/quizzes/507f1f77bcf86cd799439011', {});
    expect(res.status).toBe(401);
  });

  it('returns 401 without token for DELETE /api/quizzes/:id', async () => {
    const res = await del('/api/quizzes/507f1f77bcf86cd799439011');
    expect(res.status).toBe(401);
  });

  it('returns 401 without token for bulk endpoints', async () => {
    const publish = await post('/api/quizzes/bulk/publish', { ids: [] });
    expect(publish.status).toBe(401);
    const bulkDel = await post('/api/quizzes/bulk/delete', { ids: [] });
    expect(bulkDel.status).toBe(401);
  });

  it('returns 401 without token for import CSV', async () => {
    const res = await post('/api/quizzes/import-csv', {});
    expect(res.status).toBe(401);
  });
});

describe('Legacy routes (backward compat)', () => {
  it('returns 401 without token for legacy create-quiz', async () => {
    const res = await post('/api/create-quiz', {});
    expect(res.status).toBe(401);
  });

  it('returns 401 without token for legacy delete-quiz', async () => {
    const res = await del('/api/delete-quiz/507f1f77bcf86cd799439011');
    expect(res.status).toBe(401);
  });
});
