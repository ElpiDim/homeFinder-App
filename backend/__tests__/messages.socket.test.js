// backend/__tests__/messages.socket.test.js
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
let Message;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: "homefinder_test" });

  // import app ΜΕΤΑ τη σύνδεση
  app = require("../app");
  User = require("../models/user");       // ταιριάξε στα δικά σου paths
  Property = require("../models/property");
  Message = require("../models/messages");
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Property.deleteMany({}),
    Message.deleteMany({}),
  ]);
});

describe("Messages + Socket events", () => {
  test("sendMessage stores message and emits `newMessage` to sender & receiver rooms", async () => {
    // 1) Δημιουργούμε sender & receiver users
    const sender = await User.create({
      email: "sender@test.com",
      password: "12345678",
      role: "client",
    });

    const receiver = await User.create({
      email: "receiver@test.com",
      password: "12345678",
      role: "owner",
    });

 // 2) Δημιουργούμε property (με τα required fields)
const property = await Property.create({
  title: "Chat Test Property",
  type: "rent",
  price: 900,
  squareMeters: 60,
  location: "Ioannina",
  status: "available",
  ownerId: receiver._id,   // 👈 σωστό πεδίο για το schema σου
});


    const senderId = sender._id.toString();
    const receiverId = receiver._id.toString();
    const propertyId = property._id.toString();

    // 3) Token για τον sender
    // ⚠️ Πρόσεξε: το payload πρέπει να ταιριάζει με το auth middleware σου
    const senderToken = jwt.sign(
      { userId: senderId, role: sender.role }, // ή userId αν έτσι το περιμένεις
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 4) Φτιάχνουμε ένα fake io για να καταγράψουμε τα emits
    const emitted = [];

    const fakeIo = {
      to(roomId) {
        return {
          emit(event, payload) {
            emitted.push({ roomId: String(roomId), event, payload });
          },
        };
      },
    };

    // Το κρεμάμε στο app ώστε ο controller να κάνει req.app.get('io')
    app.set("io", fakeIo);

    // 5) Καλούμε το API POST /api/messages
    const content = "Hello via API + socket";

    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${senderToken}`)
      .send({
        receiverId,
        propertyId,
        content,
      })
      .expect(201);

    const body = res.body;
    const getId = (field) =>
      typeof field === "string" ? field : field?._id?.toString();

    // 6) Ελέγχουμε την HTTP απόκριση
    expect(body.content).toBe(content);
    expect(getId(body.sender || body.senderId)).toBe(senderId);
    expect(getId(body.receiver || body.receiverId)).toBe(receiverId);
    expect(getId(body.property || body.propertyId)).toBe(propertyId);

    // 7) Ελέγχουμε ότι αποθηκεύτηκε στη βάση
    const allMessages = await Message.find({}).lean();
    expect(allMessages.length).toBe(1);
    expect(allMessages[0].content).toBe(content);
    expect(String(allMessages[0].sender || allMessages[0].senderId)).toBe(
      senderId
    );
    expect(String(allMessages[0].receiver || allMessages[0].receiverId)).toBe(
      receiverId
    );
    expect(String(allMessages[0].property || allMessages[0].propertyId)).toBe(
      propertyId
    );

    // 8) Ελέγχουμε ότι έκανε emit σε ΔΥΟ rooms: receiverId & senderId
    expect(emitted.length).toBe(2);

    const rooms = emitted.map((e) => e.roomId);
    expect(rooms).toContain(receiverId);
    expect(rooms).toContain(senderId);

    emitted.forEach((e) => {
      expect(e.event).toBe("newMessage");
      expect(e.payload.content).toBe(content);

      const p = e.payload;
      expect(getId(p.sender || p.senderId)).toBe(senderId);
      expect(getId(p.receiver || p.receiverId)).toBe(receiverId);
      expect(getId(p.property || p.propertyId)).toBe(propertyId);
    });
  });
});
