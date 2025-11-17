// backend/__tests__/appointments.flow.test.js
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
let Message;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: "homefinder_test" });

  // import μετά τη σύνδεση ώστε τα models να «βλέπουν» την in-memory DB
  app = require("../app");
  User = require("../models/user");
  Property = require("../models/property");
  Appointment = require("../models/appointments");
  Notification = require("../models/notification");
  Message = require("../models/messages");
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
    Message.deleteMany({}),
  ]);
});

describe("Appointments — scheduling flow", () => {
  test("owner proposes slots -> tenant gets notification; tenant confirms -> owner gets notification and chat message", async () => {
    // 1) Δημιουργούμε owner & tenant
    const owner = await User.create({
      email: "ownerapp@test.com",
      password: "hashed",
      role: "owner",
      onboardingCompleted: true,
    });

    const tenant = await User.create({
      email: "tenantapp@test.com",
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

    // 2) Ο owner δημιουργεί ένα property μέσω του /api/properties
    const propRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${ownerToken}`)
      .field("title", "Appt Test Property")
      .field("location", "Ioannina")
      .field("price", "800")
      .field("type", "rent")
      .expect(201);

    const propertyId =
      propRes.body.property?._id || propRes.body.property?.id;

    expect(propertyId).toBeTruthy();

    // 3) Owner προτείνει slots (POST /api/appointments/propose)
    const slot1 = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1h
    const slot2 = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // +2h

    const proposeRes = await request(app)
      .post("/api/appointments/propose")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        propertyId,
        tenantId: tenant._id.toString(),
        availableSlots: [slot1, slot2],
      })
      .expect(201);

    expect(proposeRes.body).toEqual(
      expect.objectContaining({
        message: "Appointment slots proposed",
        appointment: expect.objectContaining({
          propertyId: propertyId.toString(),
          tenantId: tenant._id.toString(),
          ownerId: owner._id.toString(),
        }),
      })
    );

    const apptId =
      proposeRes.body.appointment?._id ||
      proposeRes.body.appointment?.id;

    expect(apptId).toBeTruthy();

    // 4) Ο tenant πρέπει να έχει notification για νέο appointment
    const tenantNotifs = await Notification.find({
      userId: tenant._id,
    }).lean();

    expect(tenantNotifs.length).toBe(1);
    const tenantNote = tenantNotifs[0];
    expect(tenantNote.type).toBe("appointment");
    expect(String(tenantNote.referenceId)).toBe(String(apptId));
    expect(String(tenantNote.senderId)).toBe(String(owner._id));
    expect(tenantNote.message).toMatch(/appointment/i);

    // 5) Ο tenant επιβεβαιώνει ένα από τα slots
    const confirmRes = await request(app)
      .put(`/api/appointments/confirm/${apptId}`) // ✅ σύμφωνα με το router
      .set("Authorization", `Bearer ${tenantToken}`)
      .send({ selectedSlot: slot2 })
      .expect(200);

    expect(confirmRes.body).toEqual(
      expect.objectContaining({
        message: "Appointment confirmed",
        appointment: expect.objectContaining({
          _id: apptId,
          status: "confirmed",
        }),
      })
    );

    const freshAppt = await Appointment.findById(apptId).lean();
    expect(freshAppt).toBeTruthy();
    expect(freshAppt.status).toBe("confirmed");
    expect(new Date(freshAppt.selectedSlot).getTime()).toBe(
      new Date(slot2).getTime()
    );

    // 6) Ο owner πρέπει να έχει notification για την επιβεβαίωση
    const ownerNotifs = await Notification.find({
      userId: owner._id,
    }).lean();

    expect(ownerNotifs.length).toBe(1);
    const ownerNote = ownerNotifs[0];
    expect(ownerNote.type).toBe("appointment");
    expect(String(ownerNote.referenceId)).toBe(String(apptId));
    expect(String(ownerNote.senderId)).toBe(String(tenant._id));
    expect(ownerNote.message).toMatch(/confirmed/i);

    // 7) Να έχει δημιουργηθεί και μήνυμα στο chat
    const messages = await Message.find({ propertyId }).lean();
    expect(messages.length).toBe(1);

    const msg = messages[0];
    expect(String(msg.senderId)).toBe(String(tenant._id));
    expect(String(msg.receiverId)).toBe(String(owner._id));
    expect(msg.content).toMatch(/Appointment confirmed/i);
  });
});
