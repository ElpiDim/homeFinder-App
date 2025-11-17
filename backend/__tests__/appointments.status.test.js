// backend/__tests__/appointments.status.test.js
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "testsecret";

const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

let app;
let mongo;
let User;
let Property;
let Appointment;
let Notification;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: "homefinder_test" });

  app = require("../app");
  User = require("../models/user");
  Property = require("../models/property");
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
    Appointment.deleteMany({}),
    Notification.deleteMany({}),
  ]);
});

describe("Appointments — update status notifications", () => {
  test("owner cancels appointment -> tenant gets appointment notification", async () => {
    // users
    const owner = await User.create({
      email: "ownerstatus@test.com",
      password: "hashed",
      role: "owner",
      onboardingCompleted: true,
    });

    const tenant = await User.create({
      email: "tenantstatus@test.com",
      password: "hashed",
      role: "client",
      onboardingCompleted: true,
    });

    const ownerToken = jwt.sign(
      { userId: owner._id.toString(), role: "owner" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const tenantToken = jwt.sign(
      { userId: tenant._id.toString(), role: "client" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // property
    const prop = await Property.create({
      title: "Status Test Property",
      ownerId: owner._id,
      price: 1000,
      location: "Ioannina",
      type: "rent",
    });

    // create appointment directly (σαν να είχαν ήδη μιλήσει)
    const appt = await Appointment.create({
      propertyId: prop._id,
      ownerId: owner._id,
      tenantId: tenant._id,
      availableSlots: [new Date()],
      status: "pending",
    });

    // owner cancels
    const res = await request(app)
      .patch(`/api/appointments/${appt._id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "cancelled" })
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        _id: appt._id.toString(),
        status: "cancelled",
      })
    );

    // tenant should have 1 notification
    const tenantNotifs = await Notification.find({ userId: tenant._id }).lean();
    expect(tenantNotifs.length).toBe(1);

    const note = tenantNotifs[0];
    expect(note.type).toBe("appointment");
    expect(String(note.referenceId)).toBe(String(appt._id));
    expect(String(note.senderId)).toBe(String(owner._id));
    expect(note.message).toMatch(/rejected|cancelled|updated/i);
  });

  test("tenant cancels appointment -> owner gets appointment notification", async () => {
    const owner = await User.create({
      email: "ownerstatus2@test.com",
      password: "hashed",
      role: "owner",
      onboardingCompleted: true,
    });

    const tenant = await User.create({
      email: "tenantstatus2@test.com",
      password: "hashed",
      role: "client",
      onboardingCompleted: true,
    });

    const ownerToken = jwt.sign(
      { userId: owner._id.toString(), role: "owner" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const tenantToken = jwt.sign(
      { userId: tenant._id.toString(), role: "client" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const prop = await Property.create({
      title: "Status Test Property 2",
      ownerId: owner._id,
      price: 800,
      location: "Ioannina",
      type: "rent",
    });

    const appt = await Appointment.create({
      propertyId: prop._id,
      ownerId: owner._id,
      tenantId: tenant._id,
      availableSlots: [new Date()],
      status: "pending",
    });

    // tenant cancels
    const res = await request(app)
      .patch(`/api/appointments/${appt._id}`)
      .set("Authorization", `Bearer ${tenantToken}`)
      .send({ status: "cancelled" })
      .expect(200);

    expect(res.body.status).toBe("cancelled");

    // owner should have 1 notification
    const ownerNotifs = await Notification.find({ userId: owner._id }).lean();
    expect(ownerNotifs.length).toBe(1);

    const note = ownerNotifs[0];
    expect(note.type).toBe("appointment");
    expect(String(note.referenceId)).toBe(String(appt._id));
    expect(String(note.senderId)).toBe(String(tenant._id));
    expect(note.message).toMatch(/cancelled|updated/i);
  });

  test("unrelated user cannot update appointment status (403)", async () => {
    const owner = await User.create({
      email: "ownerstatus3@test.com",
      password: "hashed",
      role: "owner",
    });
    const tenant = await User.create({
      email: "tenantstatus3@test.com",
      password: "hashed",
      role: "client",
    });
    const stranger = await User.create({
      email: "stranger@test.com",
      password: "hashed",
      role: "client",
    });

    const strangerToken = jwt.sign(
      { userId: stranger._id.toString(), role: "client" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const prop = await Property.create({
      title: "Status Test Property 3",
      ownerId: owner._id,
      price: 700,
      location: "Ioannina",
      type: "rent",
    });

    const appt = await Appointment.create({
      propertyId: prop._id,
      ownerId: owner._id,
      tenantId: tenant._id,
      availableSlots: [new Date()],
      status: "pending",
    });

    const res = await request(app)
      .patch(`/api/appointments/${appt._id}`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({ status: "cancelled" })
      .expect(403);

    expect(res.body).toEqual(
      expect.objectContaining({ message: "Unauthorized" })
    );

    // no notifications created
    const notifs = await Notification.find({}).lean();
    expect(notifs.length).toBe(0);

    const freshAppt = await Appointment.findById(appt._id).lean();
    expect(freshAppt.status).toBe("pending");
  });
});
