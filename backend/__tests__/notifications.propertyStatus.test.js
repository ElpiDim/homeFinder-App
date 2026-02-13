process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";

const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

let app;
let mongo;
let User;
let Property;
let Favorite;
let Notification;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: "homefinder_test" });

  app = require("../app");
  User = require("../models/user");
  Property = require("../models/property");
  Favorite = require("../models/favorites");
  Notification = require("../models/notification");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Property.deleteMany({}),
    Favorite.deleteMany({}),
    Notification.deleteMany({}),
  ]);
});

describe("Property status notifications", () => {
  test("owner marks property as rented -> interested client gets notification and socket event", async () => {
    const owner = await User.create({
      email: "owner-status@test.com",
      password: "hashed",
      role: "owner",
    });

    const client = await User.create({
      email: "client-status@test.com",
      password: "hashed",
      role: "client",
    });

    const ownerToken = jwt.sign(
      { userId: owner._id.toString(), role: "owner" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const property = await Property.create({
      title: "Sunny Apartment",
      ownerId: owner._id,
      price: 750,
      location: "Athens",
      type: "rent",
      status: "available",
    });

    await Favorite.create({ userId: client._id, propertyId: property._id });

    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    app.set("io", { to });

    const updateRes = await request(app)
      .put(`/api/properties/${property._id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "rented" })
      .expect(200);

    expect(updateRes.body.property.status).toBe("rented");

    const notifications = await Notification.find({
      userId: client._id,
      referenceId: property._id,
      type: "property_status",
    }).lean();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toMatch(/has been rented/i);

    expect(to).toHaveBeenCalledWith(client._id.toString());
    expect(emit).toHaveBeenCalledWith(
      "notification",
      expect.objectContaining({
        userId: client._id,
        type: "property_status",
      })
    );
  });
});
