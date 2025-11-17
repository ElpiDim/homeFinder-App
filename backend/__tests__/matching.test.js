// backend/__tests__/property.matching.int.test.js
// Integration: client should only see properties matching (budget + location)

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

describe('GET /api/properties — client matching integration', () => {
  test('client sees only properties that match prefs (budget + location), hard-fails excluded', async () => {
    // 1) Owner & token
    const ownerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'owner@test.com', password: '12345678', role: 'owner', name: 'Owner' })
      .expect(201);
    const ownerToken = ownerRes.body.token;

    // 2) Create properties THROUGH the API to get ownerId set
    await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Ioannina Good',
        type: 'rent',
        price: 1000,
        squareMeters: 70,
        bedrooms: 2,
        bathrooms: 1,
        location: 'Ioannina, Center',
        status: 'available',
      })
      .expect(201);

    await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Ioannina Too Cheap',
        type: 'rent',
        price: 700, // below client min
        squareMeters: 70,
        bedrooms: 2,
        bathrooms: 1,
        location: 'Ioannina',
        status: 'available',
      })
      .expect(201);

    await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Katerini Wrong City',
        type: 'rent',
        price: 1000,
        squareMeters: 80,
        bedrooms: 2,
        bathrooms: 1,
        location: 'Katerini',
        status: 'available',
      })
      .expect(201);

    // 3) Client & token
    const clientRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'client@test.com', password: '12345678', role: 'client', name: 'Client' })
      .expect(201);
    const clientToken = clientRes.body.token;

    // 4) Onboarding (use the SAME path your frontend uses: /users/onboarding)
    const onboardingPayload = {
      // personal fields (minimal)
      name: 'Client',
      phone: '2100000000',
      // preferences object EXACTLY like Onboarding.jsx builds
      preferences: {
        intent: 'rent',      // Onboarding sends intent (rent/buy)
        location: 'Ioannina',
        rentMin: 900,
        rentMax: 1200,
        sqmMin: 60,
        // extra fields optional
      },
    };

    const onboardRes = await request(app)
      .post('/users/onboarding') // <- note: no "/api" here, matching your frontend
      .set('Authorization', `Bearer ${clientToken}`)
      .send(onboardingPayload);

    // accept 2xx if present; if 404/405, we will fall back to direct DB update
    if (![200, 201, 204].includes(onboardRes.status)) {
      // fallback: directly set preferences in DB to exercise matching
      const User = require('../models/user');
      await User.updateOne(
        { email: 'client@test.com' },
        {
          $set: {
            'preferences.dealType': 'rent',     // if your code reads dealType
            'preferences.intent': 'rent',       // also keep intent for completeness
            'preferences.location': 'Ioannina',
            'preferences.rentMin': 900,
            'preferences.rentMax': 1200,
            'preferences.sqmMin': 60,
          },
        }
      );
    }

    // 5) Fetch properties as CLIENT (controller should apply matching)
    const listRes = await request(app)
      .get('/api/properties')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    const titles = listRes.body.map((p) => p.title);

    // Should contain only the matched one:
    expect(titles).toContain('Ioannina Good');

    // Should NOT include budget fail (below minPrice)
    expect(titles).not.toContain('Ioannina Too Cheap');

    // Should NOT include wrong city
    expect(titles).not.toContain('Katerini Wrong City');
  });
});
