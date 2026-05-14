import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { makeTestApp } from './setup/test-app'

describe('Healthcheck', () => {
  it('returns 200 with db and outbox stats', async () => {
    const app = makeTestApp();
    const res = await request(app).get('/api/healthz');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toMatchObject({
      status: 'ok',
      db: 'connected',
      outbox: {
        pending: expect.any(Number),
        dead_letter: expect.any(Number),
      },
      uptime: expect.any(Number),
    });
  });
});
