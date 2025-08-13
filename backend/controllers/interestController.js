// controllers/interestController.js
const Interest = require("../models/interests");
const Property = require("../models/property");
const Notification = require("../models/notification");

const STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined", // ← matches schema enum
});

// helper to create notifications
function sendNotification({ userId, senderId, type, referenceId, message }) {
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
 * Supports BOTH:
 *   PUT   /api/interests/:interestId
 *   PATCH /api/interests/:id/status
 * body: { status: 'accepted' | 'declined' | 'pending', preferredDate?: Date|string|null }
 * Notifies tenant on accepted/declined.
 */
exports.updateInterestStatus = async (req, res) => {
  console.log("[updateInterestStatus] params:", req.params, "body:", req.body);

  try {
    const interestId = req.params.interestId || req.params.id;
    if (!interestId) return res.status(400).json({ message: "Missing interest id" });

    let { status, preferredDate } = req.body;
    if (!status) return res.status(400).json({ message: "Invalid or missing status" });

    // normalize common synonyms from frontend
    const norm = String(status).toLowerCase().trim();
    if (norm === "rejected" || norm === "declined") status = STATUS.DECLINED;
    else if (norm === "accepted") status = STATUS.ACCEPTED;
    else if (norm === "pending") status = STATUS.PENDING;

    if (![STATUS.PENDING, STATUS.ACCEPTED, STATUS.DECLINED].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const interest = await Interest.findById(interestId).populate("propertyId");
    if (!interest) return res.status(404).json({ message: "Interest not found" });

    // only the property owner can update
    if (String(interest.propertyId.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    interest.status = status;

    // accept either Date or ISO/string for preferredDate; allow clearing with null
    if (preferredDate !== undefined && preferredDate !== "") {
      if (preferredDate === null) {
        interest.preferredDate = undefined;
      } else {
        const d = new Date(preferredDate);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ message: "Invalid preferredDate" });
        }
        interest.preferredDate = d;
      }
    }

    await interest.save();

    // notify tenant when accepted/declined
    if (status === STATUS.ACCEPTED || status === STATUS.DECLINED) {
            // NOTE: Notification model + frontend expect "interest_rejected"
      // for declined interests. Using a mismatched type caused
      // validation errors and missing notifications. Keep naming
      // consistent across backend and frontend.
      const type =
        status === STATUS.ACCEPTED ? "interest_accepted" : "interest_rejected";

      let msg = `Your interest for "${
        interest.propertyId.title || "the property"
      }" was ${status === STATUS.ACCEPTED ? "accepted" : "declined"}.`;

      if (status === STATUS.ACCEPTED && interest.preferredDate) {
        msg += ` Proposed date: ${new Date(
          interest.preferredDate
        ).toLocaleString()}`;
      }

      await sendNotification({
        userId: interest.tenantId,   // tenant receives
        senderId: req.user.userId,   // owner is sender
        type,
        referenceId: interest._id,
        message: msg,
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
 * Tenant fetches all their interests
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
