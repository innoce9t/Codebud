import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';

let mongo: MongoMemoryServer;
let app: ReturnType<typeof createApp>;

// Spin up an in-memory MongoDB and the real Express app (no port binding).
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
}, { timeout: 120_000 });

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('health endpoint is public', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test('auth: signup issues a session; /me requires it', async () => {
  const agent = request.agent(app);
  const signup = await agent
    .post('/api/auth/signup')
    .send({ email: 'a@example.com', password: 'secret123' });
  assert.equal(signup.status, 201);
  assert.equal(signup.body.user.email, 'a@example.com');
  assert.equal(signup.body.user.passwordHash, undefined); // never leak the hash

  const me = await agent.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, 'a@example.com');

  // No cookie => unauthorized.
  const noauth = await request(app).get('/api/auth/me');
  assert.equal(noauth.status, 401);
});

test('auth: signup validates input', async () => {
  const res = await request(app).post('/api/auth/signup').send({});
  assert.equal(res.status, 400);
});

test('projects: create, list, and per-user isolation', async () => {
  const owner = request.agent(app);
  await owner.post('/api/auth/signup').send({ email: 'owner@example.com', password: 'secret123' });

  const created = await owner.post('/api/projects').send({ name: 'Proj', type: 'javascript' });
  assert.equal(created.status, 201);
  const pid = created.body.project._id;
  assert.ok(pid);

  const list = await owner.get('/api/projects');
  assert.equal(list.status, 200);
  assert.equal(list.body.projects.length, 1);
  assert.equal(list.body.projects[0]._id, pid);

  // A different user cannot read the owner's project…
  const intruder = request.agent(app);
  await intruder.post('/api/auth/signup').send({ email: 'intruder@example.com', password: 'secret123' });
  const cross = await intruder.get(`/api/projects/${pid}`);
  assert.equal(cross.status, 403);

  // …and sees none of their own.
  const intruderList = await intruder.get('/api/projects');
  assert.equal(intruderList.status, 200);
  assert.equal(intruderList.body.projects.length, 0);
});

test('projects: creating requires auth', async () => {
  const res = await request(app).post('/api/projects').send({ name: 'X', type: 'python' });
  assert.equal(res.status, 401);
});
