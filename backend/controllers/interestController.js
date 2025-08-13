// controllers/interestController.js
const Interest = require("../models/interests");
const Property = require("../models/property");
const Notification = require("../models/notification");

const STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined", // 👈 match your schema enum
});

// helper to create notifications
async function sendNotification({ userId, senderId, type, referenceId, message }) {
  return Notification.create({ userId, senderId, type, referenceId, message });
}

/**
 * Tenant submits interest
 * POST /api/interests
 * body: { propertyId, message }
 */
exports.submitInterest = async (req, res) => {
  const tenantId = req.user.userId;
  const { propertyId, message } = req.body;

  try {
    if (!propertyId) {
      return res.status(400).json({ message: "propertyId is required" });
    }

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    // owners cannot submit interest for their own property
    if (String(property.ownerId) === String(tenantId)) {
      return res
        .status(400)
        .json({ message: "Owners cannot submit interest on their own property" });
    }

    // prevent duplicates (one interest per tenant per property)
    const existing = await Interest.findOne({ tenantId, propertyId });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Interest already submitted for selected property" });
    }

    const interest = await Interest.create({
      tenantId,
      propertyId,
      message,
      status: STATUS.PENDING,
    });

    // notify owner about the new interest
    await sendNotification({
      userId: property.ownerId,   // receiver: owner
      senderId: tenantId,         // sender: tenant
      type: "interest",
      referenceId: interest._id,  // reference the interestId (for owner's modal)
      message: `New interest on "${property.title || "your property"}".`,
    });

    res.status(200).json({ message: "Interest submitted successfully", interestId: interest._id });
  } catch (err) {
    console.error("❌ Submit interest error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get single interest by id (owner or tenant)
 * GET /api/interests/:id
 */
exports.getInterestById = async (req, res) => {
  try {
    const interest = await Interest.findById(req.params.id)
      .populate("tenantId", "name email phone")
      .populate("propertyId", "title location ownerId");

    if (!interest) return res.status(404).json({ message: "Interest not found" });

    res.json(interest);
  } catch (err) {
    console.error("❌ Get interest error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Owner updates interest status (+ optional preferredDate)
 * PATCH /api/interests/:id/status
 * body: { status: 'accepted' | 'declined' | 'pending', preferredDate?: Date|string }
 * Notifies tenant on accepted/declined.
 */
exports.updateInterestStatus = async (req, res) => {
  try {
    const { status, preferredDate } = req.body;

    if (!status || ![STATUS.PENDING, STATUS.ACCEPTED, STATUS.DECLINED].includes(status)) {
      return res.status(400).json({ message: "Invalid or missing status" });
    }

    // load interest + property for authorization and message
    const interest = await Interest.findById(req.params.id).populate("propertyId");
    if (!interest) return res.status(404).json({ message: "Interest not found" });

    // only the property owner can update
    if (String(interest.propertyId.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    interest.status = status;

    // accept either Date or ISO/string for preferredDate
    if (preferredDate !== undefined && preferredDate !== null && preferredDate !== "") {
      const d = new Date(preferredDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ message: "Invalid preferredDate" });
      }
      interest.preferredDate = d;
    } else if (preferredDate === null) {
      // allow clearing the date
      interest.preferredDate = undefined;
    }

    await interest.save();

    // notify tenant when accepted/declined
    if (status === STATUS.ACCEPTED || status === STATUS.DECLINED) {
      const type = status === STATUS.ACCEPTED ? "interest_accepted" : "interest_declined";
      let message = `Your interest for "${interest.propertyId.title || "the property"}" was ${
        status === STATUS.ACCEPTED ? "accepted" : "declined"
      }.`;

      if (status === STATUS.ACCEPTED && interest.preferredDate) {
        message += ` Proposed date: ${new Date(interest.preferredDate).toLocaleString()}`;
      }

      await sendNotification({
        userId: interest.tenantId,       // receiver: tenant
        senderId: req.user.userId,       // sender: owner
        type,
        referenceId: interest._id,
        message,
      });
    }

    // return populated interest for immediate UI update
    const updated = await Interest.findById(interest._id)
      .populate("tenantId", "name email phone")
      .populate("propertyId", "title location ownerId");

    res.json({ message: "Interest updated", interest: updated });
  } catch (err) {
    console.error("❌ Update interest error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Tenant fetches all his interests
 * GET /api/interests
 */
exports.getInterests = async (req, res) => {
  const tenantId = req.user.userId;
  try {
    const interests = await Interest.find({ tenantId }).populate("propertyId");
    res.json(interests);
  } catch (err) {
    console.error("❌ Get interests error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
