// controllers/propertyController.js
const Property = require("../models/property");
const Favorites = require("../models/favorites");
const Notification = require("../models/notification");
const Interest = require("../models/interests");
const User = require("../models/user");

const { computeMatchScore } = require("../utils/matching");

/* ----------------------------- helpers ----------------------------- */
const hasValue = (v) => v !== undefined && v !== null && String(v).trim() !== "";

const toNum = (v, parser = Number) => (hasValue(v) ? parser(v) : undefined);

const setIfProvided = (current, incoming, parser = (x) => x) =>
  hasValue(incoming) ? parser(incoming) : current;

const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "1" || v.toLowerCase() === "yes";
  if (typeof v === "number") return v === 1;
  return undefined;
};

const toArray = (v) => {
  // Accept arrays, repeated fields (features[]), CSV strings, JSON strings
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (!hasValue(v)) return [];
  const str = String(v).trim();
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
  } catch (_) {
    /* not json -> fall back to csv */
  }
  return str.split(",").map((s) => s.trim()).filter(Boolean);
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
    const images = (req.files.images || []).map((f) => `/uploads/${f.filename}`);
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

    // canonical price with backward-compat (accepts 'price' or 'rent')
    const priceNum = toNum(b.price ?? b.rent, parseFloat);
    if (!hasValue(b.title) || !hasValue(b.location) || !hasValue(priceNum) || Number(priceNum) <= 0) {
      return res.status(400).json({ message: "title, location and positive price are required." });
    }

    // Arrays
    const features = toArray(b["features[]"] ?? b.features);
    const allowedOccupations = toArray(b["allowedOccupations[]"] ?? b.allowedOccupations);

    // Tenant reqs
    const minTenantSalary = toNum(b.minTenantSalary, parseFloat);

    // Geo
    const latitude = toNum(b.latitude, parseFloat);
    const longitude = toNum(b.longitude, parseFloat);

    const newProperty = new Property({
      ownerId,
      title: b.title,
      description: b.description,
      location: b.location,
      address: b.address,

      price: priceNum, // canonical

      type: b.type, // 'rent'|'sale'
      status: b.status,

      // basic metrics
      squareMeters: toNum(b.squareMeters ?? b.sqm, parseInt),
      surface: toNum(b.surface, parseInt),
      floor: toNum(b.floor, parseInt),
      levels: toNum(b.levels, parseInt),
      bedrooms: toNum(b.bedrooms, parseInt),
      bathrooms: toNum(b.bathrooms, parseInt),
      wc: toNum(b.wc, parseInt),
      kitchens: toNum(b.kitchens, parseInt),
      livingRooms: toNum(b.livingRooms, parseInt),
      onTopFloor: toBool(b.onTopFloor) ?? false,

      // extras
      yearBuilt: toNum(b.yearBuilt, parseInt),
      condition: b.condition,
      heating: b.heating,
      energyClass: b.energyClass,
      orientation: b.orientation,
      furnished: toBool(b.furnished) ?? false,
      petsAllowed: toBool(b.petsAllowed) ?? false,
      smokingAllowed: toBool(b.smokingAllowed) ?? false,
      hasElevator: toBool(b.hasElevator) ?? false,
      hasStorage: toBool(b.hasStorage) ?? false,
      parkingSpaces: toNum(b.parkingSpaces, parseInt),
      monthlyMaintenanceFee: toNum(b.monthlyMaintenanceFee, parseFloat),
      view: b.view,
      insulation: toBool(b.insulation) ?? false,
      plotSize: toNum(b.plotSize, parseFloat),

      // media
      images,
      floorPlanImage,

      // features
      features,

      // geo
      latitude,
      longitude,

      // owner notes
      ownerNotes: b.ownerNotes,

      // tenant requirements
      tenantRequirements: {
        minTenantSalary,
        allowedOccupations,
      },
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
      q, // text in title/location
      type, // rent|sale
      minPrice,
      maxPrice,
      sort = "relevance", // relevance | newest | price_asc | price_desc | likes
      page = 1,
      limit = 24,
      filters, // JSON string of filters (legacy)
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

    // price range
    if (hasValue(minPrice) || hasValue(maxPrice)) {
      match.price = {};
      if (hasValue(minPrice)) match.price.$gte = parseFloat(minPrice);
      if (hasValue(maxPrice)) match.price.$lte = parseFloat(maxPrice);
    }

    const pipeline = [{ $match: match }];

    // (Legacy) Requirements filters block – kept for backwards-compat (no-op for the new schema)
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
                  input: { $ifNull: ["$requirements", []] }, // property.requirements δεν υπάρχει στο νέο schema
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

    // core
    property.title = b.title ?? property.title;
    property.description = b.description ?? property.description;
    property.location = b.location ?? property.location;
    property.address = b.address ?? property.address;

    // price (canonical) — accepts rent for backward-compat
    const priceNum = toNum(b.price ?? b.rent, parseFloat);
    if (hasValue(priceNum)) {
      property.price = priceNum;
    }

    // type/status
    property.type = b.type ?? property.type;
    property.status = b.status ?? property.status;

    // metrics
    property.squareMeters = setIfProvided(property.squareMeters, b.squareMeters ?? b.sqm, (v) => parseInt(v));
    property.surface = setIfProvided(property.surface, b.surface, (v) => parseInt(v));
    property.floor = setIfProvided(property.floor, b.floor, (v) => parseInt(v));
    property.levels = setIfProvided(property.levels, b.levels, (v) => parseInt(v));
    property.bedrooms = setIfProvided(property.bedrooms, b.bedrooms, (v) => parseInt(v));
    property.bathrooms = setIfProvided(property.bathrooms, b.bathrooms, (v) => parseInt(v));
    property.wc = setIfProvided(property.wc, b.wc, (v) => parseInt(v));
    property.kitchens = setIfProvided(property.kitchens, b.kitchens, (v) => parseInt(v));
    property.livingRooms = setIfProvided(property.livingRooms, b.livingRooms, (v) => parseInt(v));
    if (hasValue(b.onTopFloor)) property.onTopFloor = toBool(b.onTopFloor) ?? property.onTopFloor;

    // extras
    property.yearBuilt = setIfProvided(property.yearBuilt, b.yearBuilt, (v) => parseInt(v));
    property.condition = hasValue(b.condition) ? b.condition : property.condition;
    property.heating = hasValue(b.heating) ? b.heating : property.heating;
    property.energyClass = hasValue(b.energyClass) ? b.energyClass : property.energyClass;
    property.orientation = hasValue(b.orientation) ? b.orientation : property.orientation;
    if (hasValue(b.furnished)) property.furnished = toBool(b.furnished) ?? property.furnished;
    if (hasValue(b.petsAllowed)) property.petsAllowed = toBool(b.petsAllowed) ?? property.petsAllowed;
    if (hasValue(b.smokingAllowed)) property.smokingAllowed = toBool(b.smokingAllowed) ?? property.smokingAllowed;
    if (hasValue(b.hasElevator)) property.hasElevator = toBool(b.hasElevator) ?? property.hasElevator;
    if (hasValue(b.hasStorage)) property.hasStorage = toBool(b.hasStorage) ?? property.hasStorage;
    property.parkingSpaces = setIfProvided(property.parkingSpaces, b.parkingSpaces, (v) => parseInt(v));
    property.monthlyMaintenanceFee = setIfProvided(property.monthlyMaintenanceFee, b.monthlyMaintenanceFee, parseFloat);
    property.view = hasValue(b.view) ? b.view : property.view;
    if (hasValue(b.insulation)) property.insulation = toBool(b.insulation) ?? property.insulation;
    property.plotSize = setIfProvided(property.plotSize, b.plotSize, parseFloat);
    property.ownerNotes = hasValue(b.ownerNotes) ? b.ownerNotes : property.ownerNotes;

    // features (replace set if provided)
    const incomingFeatures = b["features[]"] ?? b.features;
    if (hasValue(incomingFeatures) || Array.isArray(incomingFeatures)) {
      property.features = toArray(incomingFeatures);
    }

    // geo
    if (hasValue(b.latitude)) property.latitude = toNum(b.latitude, parseFloat);
    if (hasValue(b.longitude)) property.longitude = toNum(b.longitude, parseFloat);

    // tenant requirements
    const incomingOcc = b["allowedOccupations[]"] ?? b.allowedOccupations;
    const occArray = toArray(incomingOcc);
    const minTenantSalary = toNum(b.minTenantSalary, parseFloat);
    if (!property.tenantRequirements) property.tenantRequirements = {};
    if (occArray.length) property.tenantRequirements.allowedOccupations = occArray;
    if (hasValue(minTenantSalary)) property.tenantRequirements.minTenantSalary = minTenantSalary;

    // images / floorplan
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
