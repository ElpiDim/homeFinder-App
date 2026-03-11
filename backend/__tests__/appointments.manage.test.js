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

describe("Appointments — manage by owner/tenant", () => {
  test("owner can reschedule and tenant can delete appointment", async () => {
    const owner = await User.create({ email: "ownermanage@test.com", password: "hashed", role: "owner" });
    const tenant = await User.create({ email: "tenantmanage@test.com", password: "hashed", role: "client" });

    const ownerToken = jwt.sign({ userId: owner._id.toString(), role: "owner" }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const tenantToken = jwt.sign({ userId: tenant._id.toString(), role: "client" }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const prop = await Property.create({
      title: "Manage Appointment Property",
      ownerId: owner._id,
      price: 990,
      location: "Athens",
      type: "rent",
    });

    const appointment = await Appointment.create({
      propertyId: prop._id,
      ownerId: owner._id,
      tenantId: tenant._id,
      availableSlots: [new Date(Date.now() + 3600 * 1000)],
      status: "pending",
    });

    const nextSlot = new Date(Date.now() + 2 * 3600 * 1000).toISOString();

    const rescheduleRes = await request(app)
      .patch(`/api/appointments/${appointment._id}/reschedule`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ selectedSlot: nextSlot })
      .expect(200);

    expect(rescheduleRes.body.message).toBe("Appointment updated");
    expect(rescheduleRes.body.appointment.status).toBe("confirmed");

    const updated = await Appointment.findById(appointment._id).lean();
    expect(new Date(updated.selectedSlot).getTime()).toBe(new Date(nextSlot).getTime());

    await request(app)
      .delete(`/api/appointments/${appointment._id}`)
      .set("Authorization", `Bearer ${tenantToken}`)
      .expect(200);

    const removed = await Appointment.findById(appointment._id).lean();
    expect(removed).toBeNull();

    const ownerNotifs = await Notification.find({ userId: owner._id }).lean();
    const tenantNotifs = await Notification.find({ userId: tenant._id }).lean();

    expect(ownerNotifs.some((n) => /deleted/i.test(n.message))).toBe(true);
    expect(tenantNotifs.some((n) => /rescheduled/i.test(n.message))).toBe(true);
  });

  test("stranger cannot reschedule or delete", async () => {
    const owner = await User.create({ email: "ownerstr@test.com", password: "hashed", role: "owner" });
    const tenant = await User.create({ email: "tenantstr@test.com", password: "hashed", role: "client" });
    const stranger = await User.create({ email: "strangerstr@test.com", password: "hashed", role: "client" });

    const strangerToken = jwt.sign({ userId: stranger._id.toString(), role: "client" }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const prop = await Property.create({
      title: "Manage Appointment Property 2",
      ownerId: owner._id,
      price: 890,
      location: "Athens",
      type: "rent",
    });

    const appointment = await Appointment.create({
      propertyId: prop._id,
      ownerId: owner._id,
      tenantId: tenant._id,
      availableSlots: [new Date(Date.now() + 3600 * 1000)],
      status: "pending",
    });

    await request(app)
      .patch(`/api/appointments/${appointment._id}/reschedule`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({ selectedSlot: new Date(Date.now() + 5 * 3600 * 1000).toISOString() })
      .expect(403);

    await request(app)
      .delete(`/api/appointments/${appointment._id}`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .expect(403);

    const stillThere = await Appointment.findById(appointment._id).lean();
    expect(stillThere).toBeTruthy();
  });
});
