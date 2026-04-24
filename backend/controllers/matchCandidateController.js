const MatchCandidate = require("../models/matchCandidate");
const Notification = require("../models/notification");
const Message = require("../models/messages");
const Property = require("../models/property");

const isOwner = (req) => String(req.user?.role || "").toLowerCase() === "owner";

const emitNotification = (req, notificationDoc) => {
  const io = req.app.get("io");
  if (!io || !notificationDoc?.userId) return;
  io.to(String(notificationDoc.userId)).emit("notification", notificationDoc);
};

exports.getOwnerCandidates = async (req, res) => {
  try {
    if (!isOwner(req)) {
      return res.status(403).json({ message: "Only owners can view candidates" });
    }

    const ownerId = req.user.userId;
    const { status = "pending", propertyId } = req.query;

    const filter = { ownerId };
    if (status) filter.status = status;
    if (propertyId) filter.propertyId = propertyId;

    const items = await MatchCandidate.find(filter)
      .sort({ createdAt: -1 })
      .populate("clientId", "name email occupation salary hasPets smoker age householdSize")
      .populate("propertyId", "title location price type")
      .lean();

    res.json(items);
  } catch (err) {
    console.error("❌ getOwnerCandidates error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.approveCandidate = async (req, res) => {
  try {
    if (!isOwner(req)) {
      return res.status(403).json({ message: "Only owners can approve candidates" });
    }

    const ownerId = req.user.userId;
    const candidate = await MatchCandidate.findById(req.params.id)
      .populate("propertyId", "_id title ownerId")
      .lean();

    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    if (String(candidate.ownerId) !== String(ownerId)) {
      return res.status(403).json({ message: "Unauthorized for this candidate" });
    }

    if (candidate.status === "approved") {
      return res.status(200).json({ message: "Candidate already approved" });
    }

    await MatchCandidate.updateOne(
      { _id: candidate._id },
      { $set: { status: "approved" } }
    );

    const propertyTitle = candidate.propertyId?.title || "the property";

    const [notification] = await Notification.create([
      {
        userId: candidate.clientId,
        type: "candidate_approved",
        referenceId: candidate.propertyId?._id || candidate._id,
        senderId: ownerId,
        message: `Great news! An owner selected you for ${propertyTitle}.` ,
      },
    ]);

    emitNotification(req, notification.toObject());

    await Message.create({
      senderId: ownerId,
      receiverId: candidate.clientId,
      propertyId: candidate.propertyId?._id || candidate.propertyId,
      content: `Hi! I selected you as a matching tenant for ${propertyTitle}. Let's discuss details.`,
      readBy: [ownerId],
    });

    res.json({ message: "Candidate approved and client notified" });
  } catch (err) {
    console.error("❌ approveCandidate error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.rejectCandidate = async (req, res) => {
  try {
    if (!isOwner(req)) {
      return res.status(403).json({ message: "Only owners can reject candidates" });
    }

    const ownerId = req.user.userId;
    const candidate = await MatchCandidate.findById(req.params.id)
      .populate("propertyId", "_id title")
      .lean();

    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    if (String(candidate.ownerId) !== String(ownerId)) {
      return res.status(403).json({ message: "Unauthorized for this candidate" });
    }

    await MatchCandidate.updateOne(
      { _id: candidate._id },
      { $set: { status: "rejected" } }
    );

    const [notification] = await Notification.create([
      {
        userId: candidate.clientId,
        type: "candidate_rejected",
        referenceId: candidate.propertyId?._id || candidate._id,
        senderId: ownerId,
        message: `Update: owner decision completed for ${candidate.propertyId?.title || "a property"}.`,
      },
    ]);
    emitNotification(req, notification.toObject());

    res.json({ message: "Candidate rejected" });
  } catch (err) {
    console.error("❌ rejectCandidate error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.notifyOwnersForNewCandidates = async (req, clientDoc, candidates) => {
  if (!Array.isArray(candidates) || !candidates.length) return;

  const propertiesById = new Map(
    (
      await Property.find({ _id: { $in: candidates.map((c) => c.propertyId) } })
        .select("_id title")
        .lean()
    ).map((p) => [String(p._id), p])
  );

  const payloads = candidates.map((candidate) => {
    const prop = propertiesById.get(String(candidate.propertyId));
    return {
      userId: candidate.ownerId,
      type: "candidate_match",
      referenceId: candidate.propertyId,
      senderId: clientDoc._id,
      message: `${clientDoc.name || clientDoc.email} matches your requirements for ${prop?.title || "a property"}. Review this candidate.`,
    };
  });

  const created = await Notification.insertMany(payloads);
  created.forEach((note) => emitNotification(req, note.toObject()));
};
