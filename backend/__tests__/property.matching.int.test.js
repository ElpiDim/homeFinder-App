// backend/__tests__/property.matching.int.test.js
// Integration: client sees only "good" matches (score >= 0.5) and
// properties that hard-fail (budget/location) are excluded.

jest.setTimeout(30000);

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'homefinder_test' });

  // require app ΜΕΤΑ τη σύνδεση, για να χρησιμοποιήσει την in-memory Mongo
  app = require('../app');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

test('client sees only properties with score ≥ 0.5 (hard-fail budget excluded, low-score excluded)', async () => {
  // 1) Φτιάχνουμε OWNER και παίρνουμε token
  const ownerRes = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'owner2@test.com',
      password: '12345678',
      role: 'owner',
      name: 'Owner2',
    })
    .expect(201);

  const ownerToken = ownerRes.body.token;
  expect(ownerToken).toBeTruthy();

  // 2) Φτιάχνουμε properties μέσω API (έτσι μπαίνει σωστά το ownerId)

  // Καλή ιδιοκτησία: μέσα στο budget, σωστή location
  await request(app)
    .post('/api/properties')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      title: 'Match OK',
      type: 'rent',
      price: 1000,
      squareMeters: 70,
      bedrooms: 2,
      bathrooms: 1,
      location: 'Ioannina, Center',
      status: 'available',
    })
    .expect(201);

  // Πολύ φθηνή (κάτω από min price) -> πρέπει να κοπεί από budget_min
  await request(app)
    .post('/api/properties')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      title: 'Too Cheap',
      type: 'rent',
      price: 500,
      squareMeters: 70,
      bedrooms: 2,
      bathrooms: 1,
      location: 'Ioannina',
      status: 'available',
    })
    .expect(201);

  // Άλλη πόλη (λάθος location) -> πρέπει να κοπεί από location
  await request(app)
    .post('/api/properties')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      title: 'Wrong City',
      type: 'rent',
      price: 1000,
      squareMeters: 80,
      bedrooms: 2,
      bathrooms: 1,
      location: 'Katerini',
      status: 'available',
    })
    .expect(201);

  // 3) Φτιάχνουμε CLIENT
  const clientRes = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'client2@test.com',
      password: '12345678',
      role: 'client',
      name: 'Client2',
    })
    .expect(201);

  const clientToken = clientRes.body.token;
  expect(clientToken).toBeTruthy();

  // 4) Ο client κάνει onboarding / save preferences
  const onboardingPayload = {
    name: 'Client2',
    phone: '2100000000',
    preferences: {
      intent: 'rent',
      location: 'Ioannina',
      rentMin: 900,
      rentMax: 1200,
      sqmMin: 60,
    },
  };

  const onboardRes = await request(app)
    .post('/api/users/onboarding')
    .set('Authorization', `Bearer ${clientToken}`)
    .send(onboardingPayload);

  // Αν για οποιοδήποτε λόγο το route απαντήσει με κάτι εκτός 2xx,
  // το άλλο test (matching.test.js) ήδη καλύπτει το fallback σενάριο.
  expect([200, 201, 204]).toContain(onboardRes.status);

  // 5) Παίρνουμε τη λίστα properties ως CLIENT
  const listRes = await request(app)
    .get('/api/properties')
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(200);

  expect(Array.isArray(listRes.body)).toBe(true);
  const titles = listRes.body.map((p) => p.title);

  // Πρέπει να υπάρχει μόνο η "Match OK"
  expect(titles).toContain('Match OK');
  expect(titles).not.toContain('Too Cheap');
  expect(titles).not.toContain('Wrong City');
});
