// controllers/propertyController.js
const Property = require("../models/property");
const Favorites = require("../models/favorites");
const Notification = require("../models/notification");
const User = require("../models/user");
const { computeMatchScore } = require("../utils/matching");
const Appointment = require("../models/appointments");


/* ----------------------------- helpers ----------------------------- */
const hasValue = (v) =>
  v !== undefined && v !== null && String(v).trim() !== "";

const toNum = (v, parser = Number) => (hasValue(v) ? parser(v) : undefined);

const setIfProvided = (current, incoming, parser = (x) => x) =>
  hasValue(incoming) ? parser(incoming) : current;

const toBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string")
    return v === "true" || v === "1" || v.toLowerCase() === "yes";
  if (typeof v === "number") return v === 1;
  return undefined;
};

const toArray = (v) => {
  // Accept arrays, repeated fields (features[]), CSV strings, JSON strings
  if (Array.isArray(v))
    return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (!hasValue(v)) return [];
  const str = String(v).trim();
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed))
      return parsed.map(String).map((s) => s.trim()).filter(Boolean);
  } catch (_) {
    /* not json -> fall back to csv */
  }
  return str.split(",").map((s) => s.trim()).filter(Boolean);
};

const normalizeRoommatePreference = (value) => {
  if (!hasValue(value)) return undefined;
  const val = String(value).toLowerCase();
  if (['any', 'roommates_only', 'no_roommates'].includes(val)) return val;
  if (['roommate', 'roommates', 'roommate_friendly', 'roommates-friendly'].includes(val))
    return 'roommates_only';
  if (['solo', 'private', 'no-roommates', 'noroommates'].includes(val)) return 'no_roommates';
  return undefined;
};

// Map user.preferences -> keys που περιμένει το matching util
const mapClientPrefs = (p = {}) => ({
  location: p.location ?? p.city ?? p.preferredCity,
  minPrice: p.minPrice ?? p.rentMin ?? p.saleMin ?? p.priceMin ?? p.budgetMin,
  maxPrice: p.maxPrice ?? p.rentMax ?? p.saleMax ?? p.priceMax,
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

/** Διαβάζει αρχεία από upload.array('images') ή upload.fields([...]) */
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

    // canonical price with backward-compat (accepts 'price' or 'rent')
    const priceNum = toNum(b.price ?? b.rent, parseFloat);
    if (
      !hasValue(b.title) ||
      !hasValue(b.location) ||
      !hasValue(priceNum) ||
      Number(priceNum) <= 0
    ) {
      return res
        .status(400)
        .json({ message: "title, location and positive price are required." });
    }

    // Arrays
    const features = toArray(b["features[]"] ?? b.features);
    const allowedOccupations = toArray(
      b["allowedOccupations[]"] ?? b.allowedOccupations
    );

    // Tenant reqs
    const minTenantSalary = toNum(b.minTenantSalary, parseFloat);
    const familyStatus = b.familyStatus && b.familyStatus !== 'any' ? b.familyStatus : undefined;
    const reqs_pets = toBool(b.tenantRequirements_petsAllowed);
    const reqs_smoker = toBool(b.tenantRequirements_smokingAllowed);
    const minTenantAge = toNum(b.minTenantAge ?? b.tenantRequirements_minTenantAge, parseInt);
    const maxTenantAge = toNum(b.maxTenantAge ?? b.tenantRequirements_maxTenantAge, parseInt);
    const maxHouseholdSize = toNum(
      b.maxHouseholdSize ?? b.tenantRequirements_maxHouseholdSize,
      parseInt
    );
    const roommatePreference = normalizeRoommatePreference(
      b.roommatePreference ?? b.tenantRequirements_roommatePreference
    );
    const tenantNotes = hasValue(b.tenantRequirements_notes ?? b.tenantRequirementsNotes)
      ? String(b.tenantRequirements_notes ?? b.tenantRequirementsNotes)
      : undefined;

    // Geo
    const latitude = toNum(b.latitude, parseFloat);
    const longitude = toNum(b.longitude, parseFloat);

    // Build doc (accept FE aliases → virtual setters στο model θα κάνουν το mapping)
    const prop = new Property({
      ownerId,
      title: b.title,
      description: b.description,
      location: b.location,
      address: b.address,

      // price/rent
      price: priceNum, // ή μπορείς να κάνεις prop.rent = priceNum;

      // listing
      type: b.type, // 'rent'|'sale'
      status: b.status,

      // dimensions (support alias sqm)
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

      // extras (accept aliases)
      yearBuilt: toNum(b.yearBuilt, parseInt),
      condition: b.condition,
      heating: hasValue(b.heatingType) ? b.heatingType : b.heating, // heatingType alias
      energyClass: b.energyClass,
      orientation: b.orientation,
      furnished: toBool(b.furnished) ?? false,
      petsAllowed: toBool(b.petsAllowed) ?? false,
      smokingAllowed: toBool(b.smokingAllowed) ?? false,
      hasElevator:
        toBool(b.elevator) ?? toBool(b.hasElevator) ?? false, // elevator alias
      hasStorage: toBool(b.hasStorage) ?? false,
      parkingSpaces:
        hasValue(b.parkingSpaces)
          ? toNum(b.parkingSpaces, parseInt)
          : toBool(b.parking) === true
          ? 1
          : 0, // parking alias -> at least 1
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
        familyStatus,
        pets: reqs_pets,
        smoker: reqs_smoker,
        minTenantAge,
        maxTenantAge,
        maxHouseholdSize,
        roommatePreference,
        notes: tenantNotes,
      },
      seenBy: [] // Initialize empty for new properties
    });

    await prop.save();
    // toJSON έχει virtuals enabled στο model
    res.status(201).json({ message: "Property created", property: prop });
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
      // filters: legacy block removed (δεν υπάρχει πλέον property.requirements)
      minMatchCount, // kept only to avoid breaking callers
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

    // For public/owner, paginate in the aggregation
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
    // Fallback: load current user if middleware didn't attach it
    let currentUser = req.currentUser;
    if (!currentUser && req.user?.role === "client" && req.user?.userId) {
      currentUser = await User.findById(req.user.userId).exec();
    }

    const isClient =
      currentUser?.role === "client" &&
      currentUser?.preferences &&
      Object.keys(currentUser.preferences).length > 0;

    if (isClient) {
      const rawPrefs = currentUser.preferences || {};
      const prefs = mapClientPrefs(rawPrefs);

      if (rawPrefs.dealType) {
        properties = properties.filter((p) => p.type === rawPrefs.dealType);
      }

      const filtered = [];
      for (const p of properties) {
        const ownerReqs = p.tenantRequirements || {};
        const { score, hardFails } = computeMatchScore(
          prefs,
          ownerReqs,
          p,
          currentUser
        );
        if (!hardFails?.length && score >= 0.5) {
          filtered.push({ ...p, matchScore: score });
        }
      }

      // pagination AFTER matching
      const pageNum = Math.max(1, parseInt(page) || 1);
      const lim = Math.max(1, Math.min(100, parseInt(limit) || 24));
      const start = (pageNum - 1) * lim;

      return res.json(filtered.slice(start, start + lim));
    }

    // public/owner flows
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

      const favMap = new Map(favoritesAgg.map((f) => [String(f._id), f.count]));

      const withStats = properties.map((p) => ({
        ...p.toObject({ virtuals: true }),
        favoritesCount: favMap.get(String(p._id)) || 0,
      }));

      return res.json(withStats);
    }

    res.json(properties.map((p) => p.toObject({ virtuals: true })));
  } catch (err) {
    console.error("❌ getMyProperties error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* --------------------------- GET PROPERTY BY ID --------------------------- */
exports.getPropertyById = async (req, res) => {
  try {
    const propertyId = req.params.propertyId;

    // 1. Populate 'seenBy' (χρήσιμο για το count αργότερα)
    const property = await Property.findById(propertyId)
      .populate("ownerId", "name email phone profilePicture")
      .populate("seenBy", "name"); // Αν θες να βλέπεις και ονόματα μελλοντικά

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // --- LOGIC ΓΙΑ UNIQUE VIEWS ---
    // Αν ο χρήστης είναι Client (όχι ο owner), τον προσθέτουμε στο seenBy
    if (req.user && req.user.role === 'client') {
      
      const alreadySeen = property.seenBy.some(
        (viewer) => viewer._id.toString() === req.user.userId.toString()
      );

      if (!alreadySeen) {
        property.seenBy.push(req.user.userId);
        await property.save();
      }
    }
    // -----------------------------

    res.json(property.toObject({ virtuals: true }));
  } catch (err) {
    console.error("❌ getPropertyById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------------------- UPDATE PROPERTY ---------------------------- */
exports.updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId);
    if (!property)
      return res.status(404).json({ message: "Property not found" });
    if (String(property.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "User is unauthorized" });
    }

    const { images: newImages, floorPlanImage } = extractImagesFromReq(req);
    const b = req.body;

    // core
    if (hasValue(b.title)) property.title = b.title;
    if (hasValue(b.description)) property.description = b.description;
    if (hasValue(b.location)) property.location = b.location;
    if (hasValue(b.address)) property.address = b.address;

    // price (accept 'rent' for legacy)
    const priceNum = toNum(b.price ?? b.rent, parseFloat);
    if (hasValue(priceNum)) property.price = priceNum;

    // type/status
    if (hasValue(b.type)) property.type = b.type;
    if (hasValue(b.status)) property.status = b.status;

    // metrics (support alias 'sqm')
    property.squareMeters = setIfProvided(
      property.squareMeters,
      b.squareMeters ?? b.sqm,
      (v) => parseInt(v)
    );
    property.surface = setIfProvided(property.surface, b.surface, (v) =>
      parseInt(v)
    );
    property.floor = setIfProvided(property.floor, b.floor, (v) => parseInt(v));
    property.levels = setIfProvided(property.levels, b.levels, (v) =>
      parseInt(v)
    );
    property.bedrooms = setIfProvided(property.bedrooms, b.bedrooms, (v) =>
      parseInt(v)
    );
    property.bathrooms = setIfProvided(property.bathrooms, b.bathrooms, (v) =>
      parseInt(v)
    );
    property.wc = setIfProvided(property.wc, b.wc, (v) => parseInt(v));
    property.kitchens = setIfProvided(property.kitchens, b.kitchens, (v) =>
      parseInt(v)
    );
    property.livingRooms = setIfProvided(
      property.livingRooms,
      b.livingRooms,
      (v) => parseInt(v)
    );
    if (hasValue(b.onTopFloor))
      property.onTopFloor = toBool(b.onTopFloor) ?? property.onTopFloor;

    // extras (accept FE aliases)
    property.yearBuilt = setIfProvided(property.yearBuilt, b.yearBuilt, (v) =>
      parseInt(v)
    );
    if (hasValue(b.condition)) property.condition = b.condition;

    // heating / heatingType alias
    if (hasValue(b.heatingType)) property.heating = b.heatingType;
    else if (hasValue(b.heating)) property.heating = b.heating;

    if (hasValue(b.energyClass)) property.energyClass = b.energyClass;
    if (hasValue(b.orientation)) property.orientation = b.orientation;
    if (hasValue(b.furnished))
      property.furnished = toBool(b.furnished) ?? property.furnished;
    if (hasValue(b.petsAllowed))
      property.petsAllowed = toBool(b.petsAllowed) ?? property.petsAllowed;
    if (hasValue(b.smokingAllowed))
      property.smokingAllowed =
        toBool(b.smokingAllowed) ?? property.smokingAllowed;

    // elevator alias
    if (hasValue(b.elevator))
      property.hasElevator = toBool(b.elevator) ?? property.hasElevator;
    else if (hasValue(b.hasElevator))
      property.hasElevator =
        toBool(b.hasElevator) ?? property.hasElevator;

    if (hasValue(b.hasStorage))
      property.hasStorage = toBool(b.hasStorage) ?? property.hasStorage;

    // parking: numeric wins; else boolean alias toggles 0/1
    if (hasValue(b.parkingSpaces)) {
      property.parkingSpaces = parseInt(b.parkingSpaces);
    } else if (hasValue(b.parking)) {
      property.parkingSpaces =
        toBool(b.parking) === true
          ? Math.max(1, property.parkingSpaces || 0)
          : 0;
    }

    property.monthlyMaintenanceFee = setIfProvided(
      property.monthlyMaintenanceFee,
      b.monthlyMaintenanceFee,
      parseFloat
    );
    if (hasValue(b.view)) property.view = b.view;
    if (hasValue(b.insulation))
      property.insulation = toBool(b.insulation) ?? property.insulation;
    property.plotSize = setIfProvided(property.plotSize, b.plotSize, parseFloat);
    if (hasValue(b.ownerNotes)) property.ownerNotes = b.ownerNotes;

    // features (replace set if provided)
    const incomingFeatures = b["features[]"] ?? b.features;
    if (hasValue(incomingFeatures) || Array.isArray(incomingFeatures)) {
      property.features = toArray(incomingFeatures);
    }

    // geo
    if (hasValue(b.latitude))
      property.latitude = toNum(b.latitude, parseFloat);
    if (hasValue(b.longitude))
      property.longitude = toNum(b.longitude, parseFloat);

    // tenant requirements
    const incomingOcc = b["allowedOccupations[]"] ?? b.allowedOccupations;
    const occArray = toArray(incomingOcc);
    const minTenantSalary = toNum(b.minTenantSalary, parseFloat);
    if (!property.tenantRequirements) property.tenantRequirements = {};
    if (occArray.length)
      property.tenantRequirements.allowedOccupations = occArray;
    if (hasValue(minTenantSalary))
      property.tenantRequirements.minTenantSalary = minTenantSalary;
    if (hasValue(b.familyStatus))
      property.tenantRequirements.familyStatus =
        b.familyStatus === 'any' ? undefined : b.familyStatus;
    if (hasValue(b.tenantRequirements_petsAllowed))
      property.tenantRequirements.pets = toBool(b.tenantRequirements_petsAllowed);
    if (hasValue(b.tenantRequirements_smokingAllowed))
      property.tenantRequirements.smoker = toBool(b.tenantRequirements_smokingAllowed);
    const minTenantAge = toNum(b.minTenantAge ?? b.tenantRequirements_minTenantAge, parseInt);
    const maxTenantAge = toNum(b.maxTenantAge ?? b.tenantRequirements_maxTenantAge, parseInt);
    const maxHouseholdSize = toNum(
      b.maxHouseholdSize ?? b.tenantRequirements_maxHouseholdSize,
      parseInt
    );
    const roommatePreference = normalizeRoommatePreference(
      b.roommatePreference ?? b.tenantRequirements_roommatePreference
    );
    if (hasValue(minTenantAge))
      property.tenantRequirements.minTenantAge = minTenantAge;
    if (hasValue(maxTenantAge))
      property.tenantRequirements.maxTenantAge = maxTenantAge;
    if (hasValue(maxHouseholdSize))
      property.tenantRequirements.maxHouseholdSize = maxHouseholdSize;
    if (roommatePreference)
      property.tenantRequirements.roommatePreference = roommatePreference;
    if (hasValue(b.tenantRequirements_notes ?? b.tenantRequirementsNotes))
      property.tenantRequirements.notes = String(
        b.tenantRequirements_notes ?? b.tenantRequirementsNotes
      );
    // images / floorplan
    if (newImages.length) {
      property.images = [...(property.images || []), ...newImages];
    }
    if (floorPlanImage) {
      property.floorPlanImage = floorPlanImage;
    }

    await property.save();
    res.json({
      message: "Property updated",
      property: property.toObject({ virtuals: true }),
    });
  } catch (err) {
    console.error("❌ updateProperty error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
/* ---------------------------- DELETE PROPERTY ---------------------------- */
exports.deleteProperty = async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (String(property.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // 1) Φέρνουμε favorites & appointments που σχετίζονται με το property
    const [favorites, appointments] = await Promise.all([
      Favorites.find({ propertyId: property._id }).lean(),
      Appointment.find({ propertyId: property._id }).lean(),
    ]);

    // 2) Ακυρώνουμε όλα τα ραντεβού για αυτό το property (δεν τα σβήνουμε)
    if (appointments.length) {
      await Appointment.updateMany(
        { propertyId: property._id },
        { $set: { status: "cancelled" } }
      );
    }

    // 3) Σβήνουμε τα favorites (δεν έχουν νόημα χωρίς property)
    if (favorites.length) {
      await Favorites.deleteMany({ propertyId: property._id });
    }

    // 4) Υπολογίζουμε σε ποιους χρήστες θα στείλουμε property_removed notification:
    //    - users που είχαν favorite
    //    - tenants από appointments
    const favUserIds = favorites.map((f) => String(f.userId));
    const tenantIds = appointments
      .map((a) => (a.tenantId ? String(a.tenantId) : null))
      .filter(Boolean);

    const targetUserIds = [...new Set([...favUserIds, ...tenantIds])];

    if (targetUserIds.length) {
      const notifications = targetUserIds.map((uid) => ({
        userId: uid,
        type: "property_removed",
        referenceId: property._id,
        senderId: req.user.userId,
        message: property.title
          ? `The property "${property.title}" has been removed. Related appointments have been cancelled.`
          : "A property you interacted with is no longer available. Related appointments have been cancelled.",
      }));

      await Notification.insertMany(notifications);
    }

    // 5) Σβήνουμε το ίδιο το property
    await property.deleteOne();

    res.json({ message: "Property and related data deleted." });
  } catch (err) {
    console.error("❌ deleteProperty error:", err);
    res.status(500).json({ message: "Server error" });
  }
};