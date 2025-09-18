// controllers/propertyController.js
const Property = require("../models/property");
const Favorites = require("../models/favorites");
const Notification = require("../models/notification");
const Interest = require("../models/interests");
const User = require("../models/user");

const { computeMatchScore } = require("../utils/matching");

/* ----------------------------- helpers ----------------------------- */
const hasValue = (v) =>
  v !== undefined && v !== null && String(v).trim() !== "";
const toNum = (v, parser = Number) => (hasValue(v) ? parser(v) : undefined);
const setIfProvided = (current, incoming, parser = (x) => x) =>
  hasValue(incoming) ? parser(incoming) : current;

const normalizeRequirementsImportance = (importance) =>
  String(importance).toLowerCase() === "high" ? "high" : "low";

const parseRequirementsInput = (raw) => {
  if (raw === undefined || raw === null || raw === "") return [];

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error("Invalid requirements format. Expected a JSON array.");
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid requirements format. Expected a JSON array.");
  }

  return parsed
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.name === "string" &&
        Object.prototype.hasOwnProperty.call(item, "value")
    )
    .map((item) => ({
      name: item.name,
      value: item.value,
      importance: normalizeRequirementsImportance(item.importance),
    }));
};

// Map user.preferences -> keys που περιμένει το matching
const mapClientPrefs = (p = {}) => ({
  maxPrice: p.maxPrice ?? p.rentMax ?? p.saleMax,
  minSqm: p.minSqm ?? p.sqmMin,
  minBedrooms: p.minBedrooms ?? p.bedrooms,
  minBathrooms: p.minBathrooms ?? p.bathrooms,
  furnished: p.furnished,
  parking: p.parking,
  elevator: p.elevator ?? p.hasElevator,
  pets: p.pets ?? p.petsAllowed,
  smoker: p.smoker ?? p.smokingAllowed,
  familyStatus: p.familyStatus,
});

// Διαβάζει αρχεία από upload.array('images') Ή upload.fields([...])
const extractImagesFromReq = (req) => {
  // array mode (images only)
  if (Array.isArray(req.files) && req.files.length) {
    return {
      images: req.files.map((f) => `/uploads/${f.filename}`),
      floorPlanImage: undefined,
    };
  }
  // fields mode
  if (req.files && typeof req.files === "object") {
    const images = (req.files.images || []).map(
      (f) => `/uploads/${f.filename}`
    );
    const floorPlanImage = req.files.floorPlanImage?.[0]
      ? `/uploads/${req.files.floorPlanImage[0].filename}`
      : undefined;
    return { images, floorPlanImage };
  }
  return { images: [], floorPlanImage: undefined };
};

/* --------------------------- CREATE PROPERTY --------------------------- */
exports.createProperty = async (req, res) => {
  const ownerId = req.user?.userId;

  if (!ownerId || req.user.role !== "owner") {
    return res.status(403).json({ message: "Only owners can add properties" });
  }

  try {
    const { images, floorPlanImage } = extractImagesFromReq(req);
    const b = req.body;

    let requirements;
    try {
      requirements = parseRequirementsInput(b.requirements);
    } catch (err) {
      console.error("Error parsing requirements:", err);
      return res
        .status(400)
        .json({ message: err.message || "Invalid requirements format." });
    }

    // Συγχρόνισε και price/rent αν θες συμβατότητα με παλιό schema
    const priceNum = toNum(b.price ?? b.rent, parseFloat);

    const newProperty = new Property({
      ownerId,
      title: b.title,
      description: b.description,
      location: b.location,
      address: b.address,

      price: priceNum,
      rent: priceNum, // αν το schema σου δεν έχει rent, απλά αγνοείται

      type: b.type, // 'rent'|'sale'
      status: b.status,

      images,
      floorPlanImage,

      squareMeters: toNum(b.squareMeters ?? b.sqm, parseInt),
      plotSize: toNum(b.plotSize, parseFloat),
      yearBuilt: toNum(b.yearBuilt, parseInt),

      requirements,
      ownerNotes: b.ownerNotes,
    });

    await newProperty.save();
    res
      .status(201)
      .json({ message: "Property created", property: newProperty });
  } catch (err) {
    console.error("❌ createProperty error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------------------- GET ALL PROPS ---------------------------- */
exports.getAllProperties = async (req, res) => {
  try {
    const {
      q, // text in title/location
      type, // rent|sale
      minPrice,
      maxPrice,
      sort = "relevance", // relevance | newest | price_asc | price_desc | likes
      page = 1,
      limit = 24,
      filters, // JSON string of filters (για απλή requirements αντιστοίχιση)
      minMatchCount, // number of filters that must match
    } = req.query;

    const numericLimit = Math.max(1, Math.min(100, parseInt(limit) || 24));
    const numericPage = Math.max(1, parseInt(page) || 1);
    const skip = (numericPage - 1) * numericLimit;

    const match = {};

    // free text search
    if (hasValue(q)) {
      const rx = new RegExp(String(q).trim(), "i");
      match.$or = [{ title: rx }, { location: rx }, { address: rx }];
    }

    if (type) match.type = type;

    // price range from query params
    if (hasValue(minPrice) || hasValue(maxPrice)) {
      match.price = {};
      if (hasValue(minPrice)) match.price.$gte = parseFloat(minPrice);
      if (hasValue(maxPrice)) match.price.$lte = parseFloat(maxPrice);
    }

    const pipeline = [{ $match: match }];

    // Requirements matching logic (query filters only)
    let parsedFilters = [];
    if (filters) {
      try {
        parsedFilters = JSON.parse(filters);
      } catch (e) {
        return res.status(400).json({ message: "Invalid filters format." });
      }
    }

    if (Array.isArray(parsedFilters) && parsedFilters.length > 0) {
      const minMatches = parseInt(minMatchCount) || 0;

      pipeline.push(
        {
          $addFields: {
            matchCount: {
              $size: {
                $filter: {
                  input: "$requirements",
                  as: "req",
                  cond: {
                    $anyElementTrue: {
                      $map: {
                        input: parsedFilters,
                        as: "filter",
                        in: {
                          $and: [
                            { $eq: ["$$req.name", "$$filter.name"] },
                            { $eq: ["$$req.value", "$$filter.value"] },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        { $match: { matchCount: { $gte: minMatches } } }
      );
    }

    // favorites lookup & computed count
    pipeline.push(
      {
        $lookup: {
          from: "favorites",
          localField: "_id",
          foreignField: "propertyId",
          as: "favDocs",
        },
      },
      { $addFields: { favoritesCount: { $size: "$favDocs" } } }
    );

    // Sorting
    if (sort === "newest") {
      pipeline.push({ $sort: { createdAt: -1 } });
    } else if (sort === "price_asc") {
      pipeline.push({ $sort: { price: 1, createdAt: -1 } });
    } else if (sort === "price_desc") {
      pipeline.push({ $sort: { price: -1, createdAt: -1 } });
    } else if (sort === "likes") {
      pipeline.push({ $sort: { favoritesCount: -1, createdAt: -1 } });
    } else {
      pipeline.push({ $sort: { favoritesCount: -1, createdAt: -1 } });
    }

    // Για clients: θα κάνουμε pagination ΜΕΤΑ το matching
    pipeline.push({ $project: { favDocs: 0 } });

    // Για public/owner ροές, κάνε pagination στην aggregation
    const roleFromTokenAgg = req.user?.role;
    const roleFromDocAgg = req.currentUser?.role;
    const isClientAgg =
      (roleFromTokenAgg === "client" || roleFromDocAgg === "client") &&
      !!req.currentUser?.preferences;

    if (!isClientAgg) {
      pipeline.push({ $skip: skip }, { $limit: numericLimit });
    }

    let properties = await Property.aggregate(pipeline);

    // --- Client-only matching >= 0.5 ---
    const roleFromToken = req.user?.role;
    const roleFromDoc = req.currentUser?.role;
    const hasPrefs = !!req.currentUser?.preferences;
    const isClient =
      (roleFromToken === "client" || roleFromDoc === "client") && hasPrefs;

    if (isClient) {
      const rawPrefs = req.currentUser.preferences || {};
      const prefs = mapClientPrefs(rawPrefs);

      // αν θέλεις "μόνο rent" όταν το δηλώνει ο client
      if (rawPrefs.dealType) {
        properties = properties.filter((p) => p.type === rawPrefs.dealType);
      }

      const filtered = [];
      for (const p of properties) {
        const ownerReqs = p.requirements || p.tenantRequirements || {};
        const { score, hardFails } = computeMatchScore(prefs, ownerReqs, p);
        if (!hardFails?.length && score >= 0.5) {
          filtered.push({ ...p, matchScore: score });
        }
      }

      // pagination ΜΕΤΑ το matching
      const pageNum = Math.max(1, parseInt(page) || 1);
      const lim = Math.max(1, Math.min(100, parseInt(limit) || 24));
      const start = (pageNum - 1) * lim;

      return res.json(filtered.slice(start, start + lim));
    }

    // public/owner ροές
    return res.json(properties);
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

      const favMap = new Map(favoritesAgg.map((f) => [String(f._id), f.count]));
      const interestMap = new Map(
        interestsAgg.map((i) => [String(i._id), i.count])
      );

      const withStats = properties.map((p) => ({
        ...p.toObject(),
        favoritesCount: favMap.get(String(p._id)) || 0,
        viewsCount: interestMap.get(String(p._id)) || 0,
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
    if (!property) return res.status(404).json({ message: "Property not found" });

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
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (String(property.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "User is unauthorized" });
    }

    const { images: newImages, floorPlanImage } = extractImagesFromReq(req);
    const b = req.body;

    // updated fields
    property.title = b.title ?? property.title;
    property.description = b.description ?? property.description;
    property.location = b.location ?? property.location;
    property.address = b.address ?? property.address;

    const priceNum = toNum(b.price ?? b.rent, parseFloat);
    if (hasValue(priceNum)) {
      property.price = priceNum;
      property.rent = priceNum;
    }

    property.type = b.type ?? property.type;
    property.status = b.status ?? property.status;
    property.squareMeters = setIfProvided(
      property.squareMeters,
      b.squareMeters ?? b.sqm,
      (v) => parseInt(v)
    );
    property.plotSize = setIfProvided(property.plotSize, b.plotSize, parseFloat);
    property.yearBuilt = setIfProvided(
      property.yearBuilt,
      b.yearBuilt,
      (v) => parseInt(v)
    );
    property.ownerNotes = b.ownerNotes ?? property.ownerNotes;

    // Update requirements
    if (b.requirements !== undefined) {
      try {
        property.requirements = parseRequirementsInput(b.requirements);
      } catch (err) {
        console.error("Error parsing requirements:", err);
        return res
          .status(400)
          .json({ message: err.message || "Invalid requirements format." });
      }
    }

    // images
    if (newImages.length) {
      property.images = [...(property.images || []), ...newImages];
    }
    if (floorPlanImage) {
      property.floorPlanImage = floorPlanImage;
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
    if (!property) return res.status(404).json({ message: "Property not found" });

    if (String(property.ownerId) !== String(req.user.userId)) {
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
