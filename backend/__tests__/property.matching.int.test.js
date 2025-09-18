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

test("client sees properties only when high requirements pass and soft score ≥ 0.5", async () => {
  // 1) Δημιουργία client με preferences
  const client = await User.create({
    email: "client@test.com",
    password: "x",
    role: "client",
    preferences: {
      dealType: "rent",
      maxPrice: 1000,
      minSqm: 70,
      minBedrooms: 2,
      minBathrooms: 1,
      furnished: true,
      parking: true,
      elevator: true,
      pets: true,
      smoker: true,
      familyStatus: "single",
    },
  });
  const token = jwt.sign({ userId: client._id, role: "client" }, process.env.JWT_SECRET);

  // 2) Seed 3 properties:
  // 2a) MATCH (πρέπει να εμφανιστεί)
  await Property.create({
    title: "Match Apt",
    location: "Athens",
    price: 900,
    rent: 900,
    type: "rent",
    squareMeters: 80,
    bedrooms: 2,
    bathrooms: 1,
    requirements: [
      { name: "familyStatus", value: "single", importance: "high" },
      { name: "pets", value: true, importance: "high" },
      { name: "furnished", value: true, importance: "low" },
      { name: "parking", value: true, importance: "low" },
      { name: "hasElevator", value: true, importance: "low" },
    ],
  });

  // 2b) HARD FAIL ON HIGH REQUIREMENT — ΔΕΝ πρέπει να εμφανιστεί
  await Property.create({
    title: "No Pets Allowed",
    location: "Athens",
    price: 950,
    rent: 950,
    type: "rent",
    squareMeters: 82,
    bedrooms: 2,
    bathrooms: 1,
    requirements: [
      { name: "familyStatus", value: "single", importance: "high" },
      { name: "pets", value: false, importance: "high" },
    ],
  });

  // 2c) LOW SCORE (< 50%) — ΔΕΝ πρέπει να εμφανιστεί
  await Property.create({
    title: "Low Score Apt",
    location: "Athens",
    price: 900,
    rent: 900,
    type: "rent",
    squareMeters: 78,
    bedrooms: 2,
    bathrooms: 1,
    requirements: [
      { name: "familyStatus", value: "single", importance: "high" },
      { name: "parking", value: false, importance: "low" },
      { name: "hasElevator", value: false, importance: "low" },
    ],
  });

  // 3) Κλήση στο endpoint ως client
  const res = await request(app)
    .get("/api/properties")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  // 4) Έλεγχοι: μόνο το "Match Apt" πρέπει να υπάρχει
  const titles = res.body.map((p) => p.title);
  expect(titles).toContain("Match Apt");
  expect(titles).not.toContain("No Pets Allowed");
  expect(titles).not.toContain("Low Score Apt");
});
