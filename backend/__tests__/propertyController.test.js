// backend/__tests__/propertyController.test.js
process.env.JWT_SECRET = "testsecret";
process.env.NODE_ENV = "test";

const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let app; // θα γίνει require αφού συνδεθούμε στη Mongo
const Property = require("../models/property");

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  // ⚠️ κάνε require το app ΜΕΤΑ τη σύνδεση
  app = require("../app");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test("GET /api/properties returns seeded property (no auth, no filters)", async () => {
  // seed ένα απλό property
  await Property.create({
    title: "Nice flat",
    location: "Athens",
    price: 150000,     // αν το schema σου θέλει rent, πρόσθεσε rent: 150000
    rent: 150000,      // <- κράτα και αυτό για σιγουριά
    type: "sale",
    squareMeters: 80
  });

  // sanity check: σιγουρέψου ότι το seed υπάρχει στη DB
  const count = await Property.countDocuments();
  expect(count).toBe(1);

  // κάλεσε ΧΩΡΙΣ Authorization ώστε να μην ενεργοποιηθεί τυχόν client-filtering
  const res = await request(app).get("/api/properties");

  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(0);
  expect(res.body[0].title).toBe("Nice flat");
});
