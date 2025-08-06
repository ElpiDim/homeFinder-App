const Property = require("../models/property");
const Favorites = require("../models/favorites");
const Notification = require("../models/notification");



// CREATE PROPERTY
exports.createProperty = async (req, res) => {
  const ownerId = req.user.userId;

  if (req.user.role !== "owner") {
    return res.status(403).json({ message: "Only owners can add properties" });
  }

  try {
    const imagePaths = req.files?.map((file) => `/uploads/${file.filename}`) || [];

    const {
      title,
      location,
      price,
      type,
      floor,
      squareMeters,
      surface,
      onTopFloor,
      levels,
      bedrooms,
      bathrooms,
      wc,
      kitchens,
      livingRooms,
      features
    } = req.body;

    const newProperty = new Property({
      title,
      location,
      price: parseFloat(price),
      type,
      floor: parseInt(floor),
      squareMeters: parseInt(squareMeters),
      surface: parseInt(surface),
      onTopFloor: onTopFloor === 'true' || onTopFloor === true,
      levels: parseInt(levels),
      bedrooms: parseInt(bedrooms),
      bathrooms: parseInt(bathrooms),
      wc: parseInt(wc),
      kitchens: parseInt(kitchens),
      livingRooms: parseInt(livingRooms),
      features: Array.isArray(features) ? features : features ? [features] : [],
      ownerId,
      images: imagePaths
    });

    await newProperty.save();
    res.status(201).json({ message: "Property created", property: newProperty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL PROPERTIES
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ONE PROPERTY
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId).populate("ownerId");
    if (!property) return res.status(404).json({ message: "Property not found" });
    res.json(property);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE PROPERTY
exports.updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId);
    if (!property) {
      console.warn("⚠️ Property not found:", req.params.propertyId);
      return res.status(404).json({ message: "Property not found" });
    }

    if (property.ownerId.toString() !== req.user.userId) {
      console.warn("❌ Unauthorized user:", req.user.userId);
      return res.status(403).json({ message: "User is unauthorized" });
    }

    // 🧾 Logging raw request body
    console.log("📩 req.body:", req.body);

    // 🖼️ Logging uploaded files
    if (req.files?.length > 0) {
      console.log("🖼️ Uploaded files:", req.files.map(f => f.filename));
    } else {
      console.log("🖼️ No new files uploaded");
    }

    const {
      title,
      location,
      price,
      type,
      floor,
      squareMeters,
      surface,
      onTopFloor,
      levels,
      bedrooms,
      bathrooms,
      wc,
      kitchens,
      livingRooms,
      status,
      features
    } = req.body;

    // ✅ Update fields safely
    property.title = title ?? property.title;
    property.location = location ?? property.location;
    property.price = !isNaN(price) ? parseFloat(price) : property.price;
    property.type = type ?? property.type;
    property.floor = !isNaN(floor) ? parseInt(floor) : property.floor;
    property.squareMeters = !isNaN(squareMeters) ? parseInt(squareMeters) : property.squareMeters;
    property.surface = !isNaN(surface) ? parseInt(surface) : property.surface;
    property.levels = !isNaN(levels) ? parseInt(levels) : property.levels;
    property.bedrooms = !isNaN(bedrooms) ? parseInt(bedrooms) : property.bedrooms;
    property.bathrooms = !isNaN(bathrooms) ? parseInt(bathrooms) : property.bathrooms;
    property.wc = !isNaN(wc) ? parseInt(wc) : property.wc;
    property.kitchens = !isNaN(kitchens) ? parseInt(kitchens) : property.kitchens;
    property.livingRooms = !isNaN(livingRooms) ? parseInt(livingRooms) : property.livingRooms;
    property.status = status ?? property.status;
    property.onTopFloor = onTopFloor === 'true' || onTopFloor === true;

    if (features !== undefined) {
      property.features = Array.isArray(features) ? features : [features];
    }

    // 📌 New image uploads
    if (req.files && req.files.length > 0) {
      const newImagePaths = req.files.map((file) => `/uploads/${file.filename}`);
      property.images = [...property.images, ...newImagePaths];
    }

    await property.save();

    
    res.json({ message: "Property updated", property });

  } catch (err) {
    console.error("❌ Update Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//delete property

exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId);
    if (!property)
      return res.status(404).json({ message: "Property not found" });

    if (property.ownerId.toString() !== req.user.userId)
      return res.status(403).json({ message: "Unauthorized" });

    // 🔍 Find all favorites (tenants) who liked this property
    const favorites = await Favorites.find({ propertyId: property._id });

    // 📩 Create notifications with message
    const notifications = favorites.map(fav => ({
      userId: fav.userId,
      type: "property_removed",
      referenceId: property._id,
      message: `The property "${property.title}" has been removed.`
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // 🧹 Clean up
    await property.deleteOne();
    await Favorites.deleteMany({ propertyId: property._id });

    res.json({ message: "Property and related favorites deleted." });
  } catch (err) {
    console.error("❌ deleteProperty error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
