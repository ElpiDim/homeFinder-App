// backend/__tests__/property.matching.int.test.js
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "testsecret";

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");
const jwt = require("jsonwebtoken");

let app; // θα το κάνουμε require αφού συνδεθούμε στη Mongo

const User = require("../models/user");
const Property = require("../models/property");

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  // ⚠️ import το app ΜΕΤΑ τη σύνδεση, για να «βλέπει» την in-memory DB
  app = require("../app");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test("client sees only properties with score ≥ 0.5 (hard-fail budget excluded, low-score excluded)", async () => {
  // 1) Δημιουργία client με preferences
  const client = await User.create({
    email: "client@test.com",
    password: "x",
    role: "client",
    preferences: {
      dealType: "rent",
      rentMax: 1000,    // budget threshold
      sqmMin: 70,       // min sqm
      bedrooms: 2,      // min bedrooms
      bathrooms: 1,
      // προτιμήσεις για soft criteria
      furnished: false,
      parking: false,
      elevator: false,
      familyStatus: "single",
      petsAllowed: true,
      smokingAllowed: true,
    },
  });
  const token = jwt.sign({ userId: client._id, role: "client" }, process.env.JWT_SECRET);

  const owner = await User.create({
    email: "owner@test.com",
    password: "x",
    role: "owner",
  });

  // 2) Seed 3 properties:
  // 2a) MATCH (πρέπει να εμφανιστεί)
  await Property.create({
    ownerId: owner._id,
    title: "Match Apt",
    location: "Athens",
    price: 900,
    type: "rent",
    squareMeters: 80,
    bedrooms: 2,
    bathrooms: 1,
    tenantRequirements: {
      familyStatus: "single",
      pets: true,
      smoker: true,
    },
  });

  // 2b) HARD FAIL (budget) — ΔΕΝ πρέπει να εμφανιστεί
  await Property.create({
    ownerId: owner._id,
    title: "Too Expensive",
    location: "Athens",
    price: 1200,     // > client.maxPrice => hard fail
    type: "rent",
    squareMeters: 85,
    bedrooms: 2,
    bathrooms: 1,
    tenantRequirements: {
      furnished: true,
    },
  });

  // 2c) LOW SCORE (< 50%) — ΔΕΝ πρέπει να εμφανιστεί
  // εντός budget/sqm, αλλά ο owner απαιτεί πολλά που ο client δεν καλύπτει → χαμηλό score
  await Property.create({
    ownerId: owner._id,
    title: "Low Score Apt",
    location: "Athens",
    price: 950,
    type: "rent",
    squareMeters: 75,
    bedrooms: 2,
    bathrooms: 1,
    tenantRequirements: {
      furnished: true,
      parking: true,
      hasElevator: true,
      familyStatus: "family", // client = single
      pets: false,
      smoker: false,
    },
  });

  // 3) Κλήση στο endpoint ως client
  const res = await request(app)
    .get("/api/properties")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  // 4) Έλεγχοι: μόνο το "Match Apt" πρέπει να υπάρχει
  const titles = res.body.map((p) => p.title);
  expect(titles).toContain("Match Apt");
  expect(titles).not.toContain("Too Expensive");
  expect(titles).not.toContain("Low Score Apt");
});
