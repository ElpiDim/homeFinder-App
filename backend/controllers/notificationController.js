const Notification = require("../models/notification");
const Interest = require("../models/interests");
const Property = require("../models/property");

// GET - fetch all notifications for a user
exports.getNotifications = async (req, res) => {
  const userId = req.user.userId;

  try {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .populate('senderId', 'name');
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH - mark notification as read
exports.markAsRead = async (req, res) => {
  const notificationId = req.params.id;

  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE - delete a notification
exports.deleteNotification = async (req, res) => {
  const notificationId = req.params.id;

  try {
    await Notification.findByIdAndDelete(notificationId);
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

//submit interest 
exports.submitInterest = async(req,res) => {
  const tenantId = req.user.userId;
  const {propertyId,message,prefferedDate} = req.body;

  
  try {
    // Check if interest already exists
    const existing = await Interest.findOne({ tenantId, propertyId });
    if (existing) {
      return res.status(400).json({ message: "Interest already submitted for this property." });
    }

    // Save interest
    const interest = new Interest({
      tenantId,
      propertyId,
      message,
      preferredDate
    });

    await interest.save();

    // Find property to get owner
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found." });
    }

    // Create notification for the owner
    const notification = new Notification({
      userId: property.ownerId,     // recipient (owner)
      senderId: tenantId,           // who triggered the action
      type: "interest",             // custom type
      referenceId: interest._id       // for future linking if needed
    });

    await notification.save();

    res.status(200).json({ message: "Interest submitted and owner notified." });
  } catch (err) {
    console.error("❌ submitInterest error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
