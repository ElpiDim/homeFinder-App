// backend/__tests__/notifications.propertyRemoved.test.js
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
let Appointment;
let Notification;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: "homefinder_test" });

  app = require("../app");
  User = require("../models/user");
  Property = require("../models/property");
  Favorite = require("../models/favorites");
  Appointment = require("../models/appointments");
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
    Appointment.deleteMany({}),
    Notification.deleteMany({}),
  ]);
});

describe("Property removed — notifications & cleanup", () => {
  test("owner deletes property -> favorites/appointments cleaned + property_removed notifications sent", async () => {
    // 1) Δημιουργούμε owner + 2 clients
    const owner = await User.create({
      email: "ownerremove@test.com",
      password: "hashed",
      role: "owner",
      onboardingCompleted: true,
    });

    const client1 = await User.create({
      email: "client1remove@test.com",
      password: "hashed",
      role: "client",
      onboardingCompleted: true,
    });

    const client2 = await User.create({
      email: "client2remove@test.com",
      password: "hashed",
      role: "client",
      onboardingCompleted: true,
    });

    const ownerToken = jwt.sign(
      { userId: owner._id.toString(), role: "owner" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 2) Δημιουργούμε property του owner
    const prop = await Property.create({
      title: "To Be Removed",
      ownerId: owner._id,
      price: 900,
      location: "Ioannina",
      type: "rent",
      status: "available",
    });

    // 3) Κάνουμε favorites από client1 & client2
    await Favorite.create({
      userId: client1._id,
      propertyId: prop._id,
    });

    await Favorite.create({
      userId: client2._id,
      propertyId: prop._id,
    });

    // 4) Δημιουργούμε appointments για το property με τους clients
    await Appointment.create({
      propertyId: prop._id,
      ownerId: owner._id,
      tenantId: client1._id,
      availableSlots: [new Date()],
      status: "pending",
    });

    await Appointment.create({
      propertyId: prop._id,
      ownerId: owner._id,
      tenantId: client2._id,
      availableSlots: [new Date()],
      status: "confirmed",
    });

    // 5) Owner σβήνει το property μέσω DELETE /api/properties/:id
    const delRes = await request(app)
      .delete(`/api/properties/${prop._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    // Δεν ξέρουμε αν είναι 200 ή 204, άρα το επιτρέπουμε και τα δύο
    expect([200, 204]).toContain(delRes.status);

    // 6) Το property πρέπει να ΜΗΝ υπάρχει
    const gone = await Property.findById(prop._id).lean();
    expect(gone).toBeNull();

    // 7) Τα favorites για αυτό το property πρέπει να έχουν καθαριστεί
    const remainingFavs = await Favorite.find({ propertyId: prop._id }).lean();
    expect(remainingFavs.length).toBe(0);

    // 8) Τα appointments για αυτό το property δεν πρέπει να είναι "ορφανά"
    const remainingAppts = await Appointment.find({ propertyId: prop._id }).lean();
    expect(remainingAppts.length).toBe(2);
    remainingAppts.forEach((appt) => {
    expect(appt.status).toBe("cancelled");
    });
    // Αν αντί για διαγραφή τα κάνεις cancelled, μπορείς να προσαρμόσεις
    // τις προσδοκίες εδώ (π.χ. expect(all(appt.status === 'cancelled'))).

    // 9) Οι clients που είχαν σχέση με το property πρέπει να έχουν property_removed notifications
    const allNotifs = await Notification.find({
      type: "property_removed",
      referenceId: prop._id,
    }).lean();

    // Περιμένουμε τουλάχιστον 2 (client1 + client2)
    expect(allNotifs.length).toBeGreaterThanOrEqual(2);

    const notifUserIds = allNotifs.map((n) => String(n.userId));
    expect(notifUserIds).toContain(String(client1._id));
    expect(notifUserIds).toContain(String(client2._id));

    // Optional: έλεγχος μηνύματος
    allNotifs.forEach((n) => {
      expect(n.message || "").toMatch(/removed|deleted|no longer available/i);
    });
  });

  test("non-owner cannot delete property and no notifications created", async () => {
    const owner = await User.create({
      email: "ownerremove2@test.com",
      password: "hashed",
      role: "owner",
    });

    const stranger = await User.create({
      email: "strangerremove@test.com",
      password: "hashed",
      role: "client",
    });

    const strangerToken = jwt.sign(
      { userId: stranger._id.toString(), role: "client" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const prop = await Property.create({
      title: "Protected Property",
      ownerId: owner._id,
      price: 1000,
      location: "Ioannina",
      type: "rent",
    });

    const res = await request(app)
      .delete(`/api/properties/${prop._id}`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .expect(403);

    // controller σου κατά πάσα πιθανότητα γυρίζει message τύπου "Not authorized"
    expect(res.body).toEqual(
      expect.objectContaining({
        message: expect.any(String),
      })
    );

    // property πρέπει να υπάρχει ακόμα
    const stillThere = await Property.findById(prop._id).lean();
    expect(stillThere).toBeTruthy();

    // και ΔΕΝ πρέπει να έχουν δημιουργηθεί notifications
    const notifs = await Notification.find({}).lean();
    expect(notifs.length).toBe(0);
  });
});
