// backend/__tests__/propertyController.test.js
process.env.JWT_SECRET = "testsecret";
process.env.NODE_ENV = "test";

const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

let app; // θα γίνει require αφού συνδεθούμε στη Mongo
const Property = require("../models/property");
const User = require("../models/user");
const Favorites = require("../models/favorites");
const Notification = require("../models/notification");
const Interest = require("../models/interests");
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

beforeEach(async () => {
  await Promise.all([
    Property.deleteMany({}),
    User.deleteMany({}),
    Favorites.deleteMany({}),
    Notification.deleteMany({}),
    Interest.deleteMany({}),
  ]);
});

const createUserAndToken = async (role = "owner", overrides = {}) => {
  const user = await User.create({
    email: `${role}.${Date.now()}@test.com`,
    password: "password",
    role,
    ...overrides,
  });

  const token = jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET
  );

  return { user, token };
};

describe("Property controller", () => {
  describe("POST /api/properties", () => {
    test("creates a property for owners and parses requirements JSON", async () => {
      const { user: owner, token } = await createUserAndToken("owner");

      const requirements = [
        { name: "furnished", value: true },
        { name: "familyStatus", value: "couple" },
      ];

      const res = await request(app)
        .post("/api/properties")
        .set("Authorization", `Bearer ${token}`)
        .field("title", "Stylish Loft")
        .field("location", "Thessaloniki")
        .field("price", "950")
        .field("type", "rent")
        .field("squareMeters", "78")
        .field("requirements", JSON.stringify(requirements))
        .expect(201);

      expect(res.body.message).toBe("Property created");
      expect(res.body.property.ownerId).toBe(String(owner._id));
      expect(res.body.property.price).toBe(950);
      expect(res.body.property.rent ?? res.body.property.price).toBe(950);
      expect(res.body.property.requirements).toEqual(
        requirements.map((r) => expect.objectContaining(r))
      );

      const saved = await Property.findOne({ title: "Stylish Loft" }).lean();
      expect(saved.title).toBe("Stylish Loft");
      expect(saved.location).toBe("Thessaloniki");
      expect(saved.price).toBe(950);
      expect(saved.rent ?? saved.price).toBe(950);
      expect(saved.type).toBe("rent");
      expect(saved.squareMeters).toBe(78);
      expect(String(saved.ownerId)).toBe(String(owner._id));
      expect(saved.requirements).toEqual(
        requirements.map((r) => expect.objectContaining(r))
      );
    });

    test("rejects creation when the authenticated user is not an owner", async () => {
      const { token } = await createUserAndToken("client");

      const res = await request(app)
        .post("/api/properties")
        .set("Authorization", `Bearer ${token}`)
        .field("title", "Client attempt")
        .field("location", "Athens")
        .field("price", "500")
        .field("type", "rent")
        .expect(403);

      expect(res.body).toEqual({ message: "Only owners can add properties" });
      expect(await Property.countDocuments()).toBe(0);
    });

    test("returns 400 when requirements payload is not valid JSON", async () => {
      const { token } = await createUserAndToken("owner");

      const res = await request(app)
        .post("/api/properties")
        .set("Authorization", `Bearer ${token}`)
        .field("title", "Broken Requirements")
        .field("location", "Athens")
        .field("price", "1200")
        .field("type", "sale")
        .field("requirements", "not-a-json")
        .expect(400);

      expect(res.body).toEqual({
        message: "Invalid requirements format. Expected a JSON string.",
      });
      expect(await Property.countDocuments()).toBe(0);
    });
  });

  describe("GET /api/properties", () => {
    test("returns seeded property without auth or filters", async () => {
      await Property.create({
        title: "Nice flat",
        location: "Athens",
        price: 150000,
        rent: 150000,
        type: "sale",
        squareMeters: 80,
      });

      const res = await request(app).get("/api/properties").expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("Nice flat");
    });

    test("applies requirement filters with minMatchCount", async () => {
      await Property.create([
        {
          title: "Family Home",
          location: "Patras",
          price: 800,
          rent: 800,
          type: "rent",
          requirements: [
            { name: "furnished", value: true },
            { name: "pets", value: false },
          ],
        },
        {
          title: "Pet Friendly",
          location: "Patras",
          price: 750,
          rent: 750,
          type: "rent",
          requirements: [
            { name: "furnished", value: true },
            { name: "pets", value: true },
          ],
        },
      ]);

      const filters = encodeURIComponent(
        JSON.stringify([
          { name: "furnished", value: true },
          { name: "pets", value: true },
        ])
      );

      const res = await request(app)
        .get(`/api/properties?filters=${filters}&minMatchCount=2`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("Pet Friendly");
    });
  });
});
