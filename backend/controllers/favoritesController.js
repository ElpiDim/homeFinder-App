const Favorites = require("../models/favorites");

exports.addFavorite = async (req, res) => {
  const userId = req.user.userId;
  const { propertyId } = req.body;
  try {
    const existing = await Favorites.findOne({ userId, propertyId });
    if (existing) return res.status(400).json({ message: "Already in favorites" });

    const favorite = new Favorites({ userId, propertyId });
    await favorite.save();
    res.status(201).json({ message: "Added to favorites" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

//get all favorites
exports.getFavorites = async (req, res) => {
  const userId = req.user.userId;
  try {
    const favorites = await Favorites.find({ userId }).populate("propertyId");
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

//delete favorites 
exports.deleteFavorite = async (req, res) => {
  const userId = req.user.userId;
  const { propertyId } = req.params.propertyId;
  try {
    await Favorites.findOneAndDelete({ userId, propertyId });
    res.json({ message: "Removed from favorites" });
  } catch (err) {
    console.log("Delete favorites route hit");
    res.status(500).json({ message: "Server error" });
  }
};
