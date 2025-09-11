// backend/tests/propertyController.test.js
const request = require('supertest');
const app = require('../server');                  // ή όπου ξεκινά το Express app
const mongoose = require('mongoose');
const Property = require('../models/propertyModel');
const User = require('../models/userModel');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('GET /api/properties with user preferences', () => {
  let mongoServer;
  let token;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Δημιουργία χρήστη με preferences
    const user = await User.create({
      name: 'Client',
      email: 'client@example.com',
      password: 'password',
      role: 'client',
      preferences: {
        location: 'Athens',
        minPrice: 100000,
        maxPrice: 200000,
        sqmMin: 50,
        bedrooms: 2
      }
    });

    // Προσποιούμαστε JWT token (ή χρησιμοποιούμε login endpoint)
    token = user.generateAuthToken();

    // Ακίνητο που ταιριάζει μερικώς (χωρίς requirements)
    await Property.create({
      title: 'Nice flat',
      location: 'Athens',
      price: 150000,
      sqm: 80,
      bedrooms: 2,
      requirements: [{ name: 'garden', value: true }]
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('returns property matching user preferences even if requirements mismatch', async () => {
    const res = await request(app)
      .get('/api/properties')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Nice flat');
  });
});
