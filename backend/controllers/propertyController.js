// controllers/propertyController.js
const Property = require("../models/property");
const Favorites = require("../models/favorites");
const Notification = require("../models/notification");
const Interest = require("../models/interests");

/* ----------------------------- helpers ----------------------------- */
const hasValue = (v) =>
  v !== undefined && v !== null && `${v}`.trim() !== "";

const toNum = (v, parser = Number) => (hasValue(v) ? parser(v) : undefined);

const setIfProvided = (current, incoming, parser = (x) => x) =>
  hasValue(incoming) ? parser(incoming) : current;

/* --------------------------- CREATE PROPERTY --------------------------- */
exports.createProperty = async (req, res) => {
  const ownerId = req.user?.userId;

  if (!ownerId || req.user.role !== "owner") {
    return res.status(403).json({ message: "Only owners can add properties" });
  }

  try {
    const imagePaths = req.files?.map((f) => `/uploads/${f.filename}`) || [];

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
      features,
      latitude,
      longitude,
    } = req.body;

    const newProperty = new Property({
      title,
      location,
      price: toNum(price, parseFloat),
      type,
      floor: toNum(floor, parseInt),
      squareMeters: toNum(squareMeters, parseInt),
      surface: toNum(surface, parseInt),
      onTopFloor:
        onTopFloor === true ||
        onTopFloor === "true" ||
        onTopFloor === "yes" ||
        onTopFloor === "1",
      levels: toNum(levels, parseInt),
      bedrooms: toNum(bedrooms, parseInt),
      bathrooms: toNum(bathrooms, parseInt),
      wc: toNum(wc, parseInt),
      kitchens: toNum(kitchens, parseInt),
      livingRooms: toNum(livingRooms, parseInt),
      latitude: toNum(latitude, Number),
      longitude: toNum(longitude, Number),
      features: Array.isArray(features) ? features : features ? [features] : [],
      ownerId,
      images: imagePaths,
    });

    await newProperty.save();
    res.status(201).json({ message: "Property created", property: newProperty });
  } catch (err) {
    console.error("❌ createProperty error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------------------- GET ALL PROPS ---------------------------- */
exports.getAllProperties = async (req, res) => {
  try {
    const {
      q,                    // text search in title/location
      type,                 // property type
      minPrice,
      maxPrice,
      sort = "relevance",   // relevance | newest | price_asc | price_desc | likes
      lat,
      lng,
      page = 1,
      limit = 24,
    } = req.query;

    const numericLimit = Math.max(1, Math.min(100, parseInt(limit) || 24));
    const numericPage = Math.max(1, parseInt(page) || 1);
    const skip = (numericPage - 1) * numericLimit;

    // βασικά φίλτρα
    const match = {};
    if (q && `${q}`.trim()) {
      const rx = new RegExp(`${q}`.trim(), "i");
      match.$or = [{ title: rx }, { location: rx }];
    }
    if (type) match.type = type;
    if (hasValue(minPrice) || hasValue(maxPrice)) {
      match.price = {};
      if (hasValue(minPrice)) match.price.$gte = parseFloat(minPrice);
      if (hasValue(maxPrice)) match.price.$lte = parseFloat(maxPrice);
    }

    // coords (αν υπάρχουν)
    const hasCoords = hasValue(lat) && hasValue(lng);
    const userLat = hasCoords ? Number(lat) : null;
    const userLng = hasCoords ? Number(lng) : null;

    // απόσταση ~ γρήγορη προσέγγιση (km) με ασφαλή μετατροπή τύπων
    const distanceExpr = hasCoords
      ? {
          $multiply: [
            111.32,
            {
              $sqrt: {
                $add: [
                  {
                    $pow: [
                      { $subtract: [{ $toDouble: "$latitude" }, userLat] },
                      2,
                    ],
                  },
                  {
                    $pow: [
                      {
                        $multiply: [
                          { $cos: [{ $degreesToRadians: userLat }] },
                          { $subtract: [{ $toDouble: "$longitude" }, userLng] },
                        ],
                      },
                      2,
                    ],
                  },
                ],
              },
            },
          ],
        }
      : null;

    const pipeline = [
      { $match: match },

      // μετράμε favorites
      {
        $lookup: {
          from: "favorites",
          localField: "_id",
          foreignField: "propertyId",
          as: "favDocs",
        },
      },
      { $addFields: { favoritesCount: { $size: "$favDocs" } } },

      // αν έχουμε coords, πρόσθεσε distanceKm
      ...(hasCoords ? [{ $addFields: { distanceKm: distanceExpr } }] : []),
    ];

    // ταξινόμηση
    if (sort === "newest") {
      pipeline.push({ $sort: { createdAt: -1 } });
    } else if (sort === "price_asc") {
      pipeline.push({ $sort: { price: 1, createdAt: -1 } });
    } else if (sort === "price_desc") {
      pipeline.push({ $sort: { price: -1, createdAt: -1 } });
    } else if (sort === "likes") {
      pipeline.push({ $sort: { favoritesCount: -1, createdAt: -1 } });
    } else {
      // ✅ strict “relevance”: distance → favorites → newest
      pipeline.push({
        $sort: hasCoords
          ? { distanceKm: 1, favoritesCount: -1, createdAt: -1 }
          : { favoritesCount: -1, createdAt: -1 },
      });
    }

    // pagination
    pipeline.push({ $skip: skip }, { $limit: numericLimit });

    // καθαρισμός προσωρινών πεδίων
    pipeline.push({ $project: { favDocs: 0 } });

    const properties = await Property.aggregate(pipeline);
    res.json(properties);
  } catch (err) {
    console.error("❌ getAllProperties error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ------------------------- GET MY PROPS + STATS ------------------------ */
exports.getMyProperties = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res
        .status(403)
        .json({ message: "Only owners can view their properties" });
    }

    const properties = await Property.find({ ownerId: req.user.userId });

    // includeStats=true => favoritesCount / interestsCount (views proxy)
    if (req.query.includeStats) {
      const ids = properties.map((p) => p._id);

      const favoritesAgg = await Favorites.aggregate([
        { $match: { propertyId: { $in: ids } } },
        { $group: { _id: "$propertyId", count: { $sum: 1 } } },
      ]);

      const interestsAgg = await Interest.aggregate([
        { $match: { propertyId: { $in: ids } } },
        { $group: { _id: "$propertyId", count: { $sum: 1 } } },
      ]);

      const favMap = new Map(
        favoritesAgg.map((f) => [String(f._id), f.count])
      );
      const interestMap = new Map(
        interestsAgg.map((i) => [String(i._id), i.count])
      );

      const withStats = properties.map((p) => ({
        ...p.toObject(),
        favoritesCount: favMap.get(String(p._id)) || 0,
        viewsCount: interestMap.get(String(p._id)) || 0, // or interestsCount
      }));

      return res.json(withStats);
    }

    res.json(properties);
  } catch (err) {
    console.error("❌ getMyProperties error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* --------------------------- GET PROPERTY BY ID --------------------------- */
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId).populate(
      "ownerId"
    );
    if (!property)
      return res.status(404).json({ message: "Property not found" });
    res.json(property);
  } catch (err) {
    console.error("❌ getPropertyById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------------------- UPDATE PROPERTY ---------------------------- */
exports.updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (property.ownerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: "User is unauthorized" });
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
      features,
      latitude,
      longitude,
    } = req.body;

    // strings/values
    property.title = title ?? property.title;
    property.location = location ?? property.location;
    property.type = type ?? property.type;
    property.status = status ?? property.status;

    // numbers with guards
    property.price = setIfProvided(property.price, price, parseFloat);
    property.floor = setIfProvided(property.floor, floor, (v) => parseInt(v));
    property.squareMeters = setIfProvided(
      property.squareMeters,
      squareMeters,
      (v) => parseInt(v)
    );
    property.surface = setIfProvided(property.surface, surface, (v) =>
      parseInt(v)
    );
    property.levels = setIfProvided(property.levels, levels, (v) =>
      parseInt(v)
    );
    property.bedrooms = setIfProvided(property.bedrooms, bedrooms, (v) =>
      parseInt(v)
    );
    property.bathrooms = setIfProvided(property.bathrooms, bathrooms, (v) =>
      parseInt(v)
    );
    property.wc = setIfProvided(property.wc, wc, (v) => parseInt(v));
    property.kitchens = setIfProvided(property.kitchens, kitchens, (v) =>
      parseInt(v)
    );
    property.livingRooms = setIfProvided(
      property.livingRooms,
      livingRooms,
      (v) => parseInt(v)
    );

    // geo (optional)
    property.latitude = setIfProvided(property.latitude, latitude, Number);
    property.longitude = setIfProvided(property.longitude, longitude, Number);

    // booleans
    if (onTopFloor !== undefined) {
      property.onTopFloor =
        onTopFloor === true ||
        onTopFloor === "true" ||
        onTopFloor === "yes" ||
        onTopFloor === "1";
    }

    // features (array or single)
    if (features !== undefined) {
      property.features = Array.isArray(features) ? features : [features];
    }

    // images
    if (req.files?.length) {
      const newImagePaths = req.files.map((f) => `/uploads/${f.filename}`);
      property.images = [...property.images, ...newImagePaths];
    }

    await property.save();
    res.json({ message: "Property updated", property });
  } catch (err) {
    console.error("❌ updateProperty error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------------------- DELETE PROPERTY ---------------------------- */
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId);
    if (!property)
      return res.status(404).json({ message: "Property not found" });

    if (property.ownerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // users who favorited it
    const favorites = await Favorites.find({ propertyId: property._id });

    // notify them
    const notifications = favorites.map((fav) => ({
      userId: fav.userId,
      type: "property_removed",
      referenceId: property._id,
      message: `The property "${property.title}" has been removed.`,
    }));
    if (notifications.length) {
      await Notification.insertMany(notifications);
    }

    // cleanup
    await Favorites.deleteMany({ propertyId: property._id });
    await Interest.deleteMany({ propertyId: property._id });
    await property.deleteOne();

    res.json({ message: "Property and related data deleted." });
  } catch (err) {
    console.error("❌ deleteProperty error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
