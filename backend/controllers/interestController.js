// controllers/interestsController.js
const Interest = require("../models/interests");
const Property = require("../models/property");
const Notification = require("../models/notification");

const STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
});

// small helper to create notifications
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

    // block owner from sending interest to own property
    if (String(property.ownerId) === String(tenantId)) {
      return res.status(400).json({ message: "Owners cannot submit interest on their own property" });
    }

    // prevent duplicates
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
      userId: property.ownerId,        // owner receives
      senderId: tenantId,              // tenant is the sender
      type: "interest",
      referenceId: interest._id,       // IMPORTANT: reference the interestId for owner's modal
      message: `New interest on "${property.title}".`,
    });

    res.status(200).json({ message: "Interest submitted successfully", interestId: interest._id });
  } catch (err) {
    console.error("❌ Submit interest error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Owner (or tenant) fetches interest by id (used by InterestsModal)
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
 * Owner updates interest status + (optional) preferredDate
 * PATCH /api/interests/:id/status
 * body: { status: 'accepted' | 'rejected' | 'pending', preferredDate?: Date }
 *
 * Notifies tenant on accept/reject.
 */
exports.updateInterestStatus = async (req, res) => {
  try {
    const { status, preferredDate } = req.body;
    if (!status || ![STATUS.PENDING, STATUS.ACCEPTED, STATUS.REJECTED].includes(status)) {
      return res.status(400).json({ message: "Invalid or missing status" });
    }

    // load interest + property for ownership check and messaging
    const interest = await Interest.findById(req.params.id).populate("propertyId");
    if (!interest) return res.status(404).json({ message: "Interest not found" });

    // only the property owner can update
    if (String(interest.propertyId.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    interest.status = status;
    if (preferredDate !== undefined) interest.preferredDate = preferredDate;
    await interest.save();

    // notify tenant on accept/reject
    let type = "interest";
    let message = `Your interest for "${interest.propertyId.title}" was updated.`;
    if (status === STATUS.ACCEPTED) {
      type = "interest_accepted";
      message = `Your interest for "${interest.propertyId.title}" was accepted.` +
        (preferredDate ? ` Proposed date: ${new Date(preferredDate).toLocaleString()}` : "");
    } else if (status === STATUS.REJECTED) {
      type = "interest_rejected";
      message = `Your interest for "${interest.propertyId.title}" was rejected.`;
    }

    await sendNotification({
      userId: interest.tenantId,            // tenant receives
      senderId: req.user.userId,            // owner is the sender
      type,
      referenceId: interest.propertyId._id, // link tenants back to the property page
      message,
    });

    res.json({ message: "Interest updated", interest });
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
