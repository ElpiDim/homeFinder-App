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
  User = require("../models/user");
  Property = require("../models/property");
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
    Message.deleteMany({}),
  ]);
});

describe("Messages + Socket events", () => {
  test("sendMessage stores message and emits `newMessage` to sender & receiver rooms", async () => {
    // 1) Δημιουργούμε sender & receiver users
    const sender = await User.create({
      email: "sender@test.com",
      password: "hashed",
      role: "client",
    });

    const receiver = await User.create({
      email: "receiver@test.com",
      password: "hashed",
      role: "owner",
    });

    // 2) Δημιουργούμε property
    const property = await Property.create({
      title: "Chat Test Property",
      ownerId: receiver._id,
      price: 900,
      location: "Ioannina",
      type: "rent",
    });

    const senderToken = jwt.sign(
      { userId: sender._id.toString(), role: sender.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 3) Φτιάχνουμε ένα fake io για να καταγράψουμε τα emits
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

    // 4) Καλούμε το API POST /api/messages
    const content = "Hello via API + socket";

    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${senderToken}`)
      .send({
        receiverId: receiver._id.toString(),
        propertyId: property._id.toString(),
        content,
      })
      .expect(201);

    // 5) Ελέγχουμε την HTTP απόκριση (το μήνυμα που αποθηκεύτηκε)
    expect(res.body).toEqual(
      expect.objectContaining({
        content,
        senderId: expect.any(Object),
        receiverId: expect.any(Object),
        propertyId: expect.any(Object),
      })
    );

    // 6) Ελέγχουμε ότι αποθηκεύτηκε στη βάση
    const allMessages = await Message.find({}).lean();
    expect(allMessages.length).toBe(1);
    expect(allMessages[0].content).toBe(content);
    expect(String(allMessages[0].senderId)).toBe(String(sender._id));
    expect(String(allMessages[0].receiverId)).toBe(String(receiver._id));

    // 7) Ελέγχουμε ότι έκανε emit σε ΔΥΟ rooms: receiverId & senderId
    expect(emitted.length).toBe(2);

    const rooms = emitted.map((e) => e.roomId);
    expect(rooms).toContain(String(receiver._id));
    expect(rooms).toContain(String(sender._id));

    emitted.forEach((e) => {
      expect(e.event).toBe("newMessage");
      expect(e.payload.content).toBe(content);
      // payload είναι populated:
      expect(String(e.payload.senderId._id || e.payload.senderId)).toBe(
        String(sender._id)
      );
      expect(String(e.payload.receiverId._id || e.payload.receiverId)).toBe(
        String(receiver._id)
      );
      expect(String(e.payload.propertyId._id || e.payload.propertyId)).toBe(
        String(property._id)
      );
    });
  });
});
