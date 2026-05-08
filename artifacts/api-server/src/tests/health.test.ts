import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { makeTestApp } from './setup/test-app'

describe('Healthcheck', () => {
  it('returns ok', async () => {
    const app = makeTestApp();
    const res = await request(app).get('/api/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
