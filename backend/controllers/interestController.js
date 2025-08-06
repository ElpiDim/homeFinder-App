const Interest = require("../models/interests");
const Property = require("../models/property");
const Notification = require("../models/notification");

// Submit interest
exports.submitInterest = async (req, res) => {
  const tenantId = req.user.userId;
  const { propertyId, message, preferredDate } = req.body;

  try {
    // Check if already submitted
    const existing = await Interest.findOne({ tenantId, propertyId });
    if (existing) {
      return res.status(400).json({ message: "Interest already submitted for selected property" });
    }

    // Save the interest
    const interest = new Interest({
      tenantId,
      propertyId,
      message,
      preferredDate,
    });
    await interest.save();

    // Find the property to get owner
    const property = await Property.findById(propertyId);
    if (!property || !property.ownerId) {
      return res.status(404).json({ message: "Property or owner not found" });
    }

    // Send notification to the owner
    const notification = new Notification({
      userId: property.ownerId,       // The recipient (owner)
      senderId: tenantId,             // The interested tenant
      type: "interest",               // Notification type
      referenceId: propertyId         // Related property
    });

    await notification.save();

    res.status(200).json({ message: "Interest submitted successfully" });

  } catch (err) {
    console.error("❌ Submit interest error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all interests for a tenant
exports.getInterests = async (req, res) => {
  const tenantId = req.user.userId;
  try {
    const interests = await Interest.find({ tenantId }).populate("propertyId");
    res.json(interests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update interest status (approved/rejected)
exports.updateInterestStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const interest = await Interest.findByIdAndUpdate(
      req.params.interestId,
      { status },
      { new: true }
    );
    res.json({ message: "Status updated", interest });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
