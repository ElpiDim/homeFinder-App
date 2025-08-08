const Interest = require("../models/interests");
const Property = require("../models/property");
const Notification = require("../models/notification");

// 🔸 1. Tenant submits interest
exports.submitInterest = async (req, res) => {
  const tenantId = req.user.userId;
  const { propertyId, message } = req.body;

  try {
    const existing = await Interest.findOne({ tenantId, propertyId });
    if (existing) {
      return res.status(400).json({ message: "Interest already submitted for selected property" });
    }

    const interest = new Interest({
      tenantId,
      propertyId,
      message
    });
    await interest.save();

    const property = await Property.findById(propertyId);
    if (!property || !property.ownerId) {
      return res.status(404).json({ message: "Property or owner not found" });
    }

    const notification = new Notification({
      userId: property.ownerId,
      senderId: tenantId,
      type: "interest",
      referenceId: interest._id // 👈 πολύ σημαντικό: όχι propertyId αλλά interestId
    });

    await notification.save();

    res.status(200).json({ message: "Interest submitted successfully" });

  } catch (err) {
    console.error("❌ Submit interest error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//  2. Owner fetches interest details by ID
exports.getInterestById = async (req, res) => {
  try {
    const interest = await Interest.findById(req.params.id)
      .populate("tenantId", "name email phone")
      .populate("propertyId", "title location");

    if (!interest) return res.status(404).json({ message: "Interest not found" });

    res.json(interest);
  } catch (err) {
    console.error("❌ Get interest error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//  3. Owner updates interest status + preferredDate
exports.updateInterestStatus = async (req, res) => {
  const { status, preferredDate } = req.body;
  try {
    const interest = await Interest.findByIdAndUpdate(
      req.params.interestId,
      { status, preferredDate },
      { new: true }
    );

    if (!interest) return res.status(404).json({ message: "Interest not found" });

    res.json({ message: "Interest updated", interest });
  } catch (err) {
    console.error("❌ Update interest error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//  4. Tenant fetches all his interests
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
