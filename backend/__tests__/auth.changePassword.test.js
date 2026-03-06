process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri, { dbName: 'homefinder_test' });
  app = require('../app');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('POST /api/auth/change-password', () => {
  test('changes password for authenticated user and invalidates old password', async () => {
    const email = 'changepw@test.com';
    const oldPassword = '12345678';
    const newPassword = 'newpassword123';

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email, password: oldPassword, role: 'client' })
      .expect(201);

    const token = registerRes.body.token;

    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: oldPassword, newPassword })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ email, password: oldPassword })
      .expect(400);

    await request(app)
      .post('/api/auth/login')
      .send({ email, password: newPassword })
      .expect(200);
  });

  test('rejects incorrect current password', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'wrongcurrent@test.com', password: '12345678', role: 'client' })
      .expect(201);

    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${registerRes.body.token}`)
      .send({ currentPassword: 'badpassword', newPassword: 'newpassword123' })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toMatch(/Current password is incorrect/i);
      });
  });
});
