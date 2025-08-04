const Favorites = require("../models/favorites");
const User = require("../models/user");
const Notification = require("../models/notification");
const Property = require("../models/property");
const addFavorite = async (req, res) => {
  const userId = req.user.userId;
  const { propertyId } = req.body;

  try {
    const existing = await Favorites.findOne({ userId, propertyId });
    if (existing) return res.status(400).json({ message: "Already in favorites" });

    const favorite = new Favorites({ userId, propertyId });
    await favorite.save();

    const property = await Property.findById(propertyId).select('ownerId');
    if (!property) return res.status(404).json({ message: "Property not found" });

    const ownerId = property.ownerId;
    const tenant = await User.findById(userId).select('name');
    const tenantName = tenant ? tenant.name : undefined;

    if (ownerId && ownerId.toString() !== userId) {
      try {
        await Notification.create({
          userId: ownerId,
          type: 'favorite',
          referenceId: propertyId,
          tenantName,
          favoritedAt: new Date(),
        });
      } catch (notificationError) {
        console.error('Error creating favorite notification:', notificationError);
      }
    }

    res.status(201).json({ message: "Added to favorites" });
  } catch (err) {
    console.error("Error in addFavorite:", err);
    res.status(500).json({ message: "Server error" });
  }
};



const getFavorites = async (req, res) => {
  const userId = req.user.userId;
  try {
    const favorites = await Favorites.find({ userId }).populate("propertyId");
    const filtered = favorites.filter(f => f.propertyId !== null); // ✅ remove invalid ones
    res.json(filtered);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

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
