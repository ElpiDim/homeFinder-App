// backend/__tests__/notifications.favorite.test.js
jest.setTimeout(20000);
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
let app;
let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: "homefinder_test" });
  app = require("../app");
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe("Notifications — Favorite flow", () => {
  test("owner receives notification when client favorites property", async () => {
    // 1) Owner signup + create property
    const ownerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "ownerfav@test.com", password: "12345678", role: "owner" })
      .expect(201);
    const ownerToken = ownerRes.body.token;

    const propRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "FavTest Property",
        type: "rent",
        price: 950,
        squareMeters: 70,
        location: "Ioannina",
        status: "available",
      })
      .expect(201);

    const propertyId = propRes.body.property._id;
    expect(propertyId).toBeTruthy();

    // 2) Client signup
    const clientRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "clientfav@test.com", password: "12345678", role: "client" })
      .expect(201);
    const clientToken = clientRes.body.token;

    // 3) Client favorites the property
    await request(app)
      .post("/api/favorites")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ propertyId })
      .expect(201);

    // 4) Owner fetches notifications
    const notifRes = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);

    const favorites = notifRes.body.filter((n) => n.type === "favorite");
    expect(favorites.length).toBeGreaterThan(0);

    const favNote = favorites[0];

    expect(favNote.type).toBe("favorite");
    expect(String(favNote.referenceId)).toBe(String(propertyId));

    // ο χρήστης που λαμβάνει την ειδοποίηση (owner)
    expect(favNote.userId).toBeTruthy();

    // ο χρήστης που έστειλε την ειδοποίηση (client που έκανε favorite)
    expect(favNote.senderId).toBeTruthy();

  });
});
