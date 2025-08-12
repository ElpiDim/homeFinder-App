const Favorites = require("../models/favorites");
const Notification = require("../models/notification");
const Property = require("../models/property");
const User = require("../models/user");


// ADD FAVORITE// ADD FAVORITE
const addFavorite = async (req, res) => {
  const userId = req.user.userId;
  const { propertyId } = req.body;

  try {
    const existing = await Favorites.findOne({ userId, propertyId });
    if (existing) return res.status(400).json({ message: "Already in favorites" });

    const favorite = new Favorites({ userId, propertyId });
    await favorite.save();

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    const ownerId = property.ownerId;

    // Get a robust display name for the sender
    const tenant = await User
      .findById(userId)
      .select("name firstName lastName email");
    const senderName =
      (tenant?.name && tenant.name.trim()) ||
      [tenant?.firstName, tenant?.lastName].filter(Boolean).join(" ").trim() ||
      tenant?.email ||
      "A user";

    if (ownerId && ownerId.toString() !== userId) {
      await Notification.create({
        userId: ownerId,
        type: "favorite",
        referenceId: property._id,
        senderId: userId,
        message: `${senderName} added your property "${property.title}" to favorites.`
      });
    }

    res.status(201).json({ message: "Added to favorites" });
  } catch (err) {
    console.error("❌ Error in addFavorite:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// GET FAVORITES
const getFavorites = async (req, res) => {
  const userId = req.user.userId;
  try {
    const favorites = await Favorites.find({ userId }).populate("propertyId");
    const filtered = favorites.filter(f => f.propertyId !== null); // ✅ filter out deleted properties
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE FAVORITE
const deleteFavorite = async (req, res) => {
  const userId = req.user.userId;
  const propertyId = req.params.propertyId;
  try {
    await Favorites.findOneAndDelete({ userId, propertyId });
    res.json({ message: "Removed from favorites" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  addFavorite,
  getFavorites,
  deleteFavorite
};
