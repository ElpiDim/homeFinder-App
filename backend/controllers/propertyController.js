// controllers/propertyController.js
const Property = require("../models/property");
const Favorites = require("../models/favorites");
const Notification = require("../models/notification");
const Interest = require("../models/interests");
const User = require("../models/user");

/* ----------------------------- helpers ----------------------------- */
const hasValue = (v) => v !== undefined && v !== null && `${v}`.trim() !== "";
const toNum = (v, parser = Number) => (hasValue(v) ? parser(v) : undefined);
const setIfProvided = (current, incoming, parser = (x) => x) =>
  hasValue(incoming) ? parser(incoming) : current;

// read files from either upload.array('images') OR upload.fields([{name:'images'},{name:'floorPlanImage'}])
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
    const images = Array.isArray(req.files.images)
      ? req.files.images.map((f) => `/uploads/${f.filename}`)
      : [];
    const floorPlanImage = Array.isArray(req.files.floorPlanImage)
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

    const newProperty = new Property({
      /* required/basics */
      ownerId,
      title: b.title,
      location: b.location,
      price: toNum(b.price, parseFloat),
      type: b.type, // 'rent' | 'sale'

      /* optional core */
      description: b.description,
      address: b.address,
      floor: toNum(b.floor, parseInt),
      squareMeters: toNum(b.squareMeters ?? b.sqm, parseInt),
      surface: toNum(b.surface, parseInt),
      onTopFloor:
        b.onTopFloor === true ||
        b.onTopFloor === "true" ||
        b.onTopFloor === "yes" ||
        b.onTopFloor === "1",
      levels: toNum(b.levels, parseInt),
      bedrooms: toNum(b.bedrooms, parseInt),
      bathrooms: toNum(b.bathrooms, parseInt),
      wc: toNum(b.wc, parseInt),
      kitchens: toNum(b.kitchens, parseInt),
      livingRooms: toNum(b.livingRooms, parseInt),
      constructionYear: toNum(b.constructionYear, parseInt),
      renovationYear: toNum(b.renovationYear, parseInt),
      condition: b.condition, // 'new','good','needs_renovation',...
      hasElevator: b.hasElevator === "true" || b.hasElevator === true,
      hasStorage: b.hasStorage === "true" || b.hasStorage === true,
      furnished: b.furnished === "true" || b.furnished === true,
      parkingSpaces: toNum(b.parkingSpaces, parseInt),
      parking: b.parking === "true" || b.parking === true,
      heating: b.heating, // e.g. 'natural_gas', 'heat_pump', ...
      energyClass: b.energyClass, // A+..G
      orientation: b.orientation, // N/E/S/W/SE,...
      petsAllowed: b.petsAllowed === "true" || b.petsAllowed === true,
      smokingAllowed: b.smokingAllowed === "true" || b.smokingAllowed === true,
      monthlyMaintenanceFee: toNum(b.monthlyMaintenanceFee, parseFloat),
      view: b.view, // 'sea','park',...
      insulation: b.insulation === "true" || b.insulation === true,
      ownerNotes: b.ownerNotes,

      tenantRequirements:
        typeof b.tenantRequirements === "string"
          ? JSON.parse(b.tenantRequirements)
          : (b.tenantRequirements || {}),

      /* arrays */
      features: Array.isArray(b["features[]"])
        ? b["features[]"]
        : Array.isArray(b.features)
        ? b.features
        : b.features
        ? [b.features]
        : [],

      /* geo */
      latitude: toNum(b.latitude, Number),
      longitude: toNum(b.longitude, Number),

      /* media */
      images,
      ...(floorPlanImage ? { floorPlanImage } : {}),
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
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc",
      type,
      minPrice,
      maxPrice,
      minSquareMeters,
      maxSquareMeters,
      bedrooms,
      bathrooms,
      location,
      ownerId,
      search,
      features,
      hasElevator,
      furnished,
      petsAllowed,
      parking,
      status,
    } = req.query;

    const match = {};

    if (type) match.type = type; // rent|sale
    if (status) match.status = status;
    if (ownerId) match.ownerId = ownerId;
    if (location) match.location = { $regex: location, $options: "i" };

    // features (array)
    if (features) {
      const arr = Array.isArray(features) ? features : `${features}`.split(",");
      match.features = { $all: arr.filter(Boolean) };
    }

    if (bedrooms) match.bedrooms = { $gte: Number(bedrooms) };
    if (bathrooms) match.bathrooms = { $gte: Number(bathrooms) };

    // booleans
    if (hasElevator !== undefined)
      match.hasElevator =
        hasElevator === "true" || hasElevator === true ? true : false;
    if (furnished !== undefined)
      match.furnished = furnished === "true" || furnished === true ? true : false;
    if (petsAllowed !== undefined)
      match.petsAllowed =
        petsAllowed === "true" || petsAllowed === true ? true : false;
    if (parking !== undefined)
      match.parking = parking === "true" || parking === true ? true : false;

    // text search
    if (search) {
      match.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    // price & square meters use $expr (fields may be strings in DB)
    const expr = [];
    if (minPrice) expr.push({ $gte: [{ $toDouble: "$price" }, Number(minPrice)] });
    if (maxPrice) expr.push({ $lte: [{ $toDouble: "$price" }, Number(maxPrice)] });

    // sqm filter via $expr to tolerate stringy data
    if (minSquareMeters)
      expr.push({
        $gte: [{ $toDouble: "$squareMeters" }, Number(minSquareMeters)],
      });
    if (maxSquareMeters)
      expr.push({
        $lte: [{ $toDouble: "$squareMeters" }, Number(maxSquareMeters)],
      });

    const pipeline = [{ $match: match }];
    if (expr.length) pipeline.push({ $match: { $expr: { $and: expr } } });

    // sorting
    const sortStage = {};
    sortStage[sortBy] = sortOrder === "asc" ? 1 : -1;
    pipeline.push({ $sort: sortStage });

    // pagination
    pipeline.push(
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    );

    const [items, total] = await Promise.all([
      Property.aggregate(pipeline),
      Property.countDocuments(match),
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      pageSize: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error("❌ getAllProperties error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* --------------------------- GET ONE PROPERTY --------------------------- */
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });
    res.json(property);
  } catch (err) {
    console.error("❌ getPropertyById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* --------------------------- UPDATE PROPERTY --------------------------- */
exports.updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (String(property.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "User is unauthorized" });
    }

    const { images: newImages, floorPlanImage } = extractImagesFromReq(req);
    const b = req.body;

    // strings
    property.title = b.title ?? property.title;
    property.location = b.location ?? property.location;
    property.type = b.type ?? property.type;
    property.status = b.status ?? property.status;
    property.description = b.description ?? property.description;
    property.address = b.address ?? property.address;
    property.condition = b.condition ?? property.condition;
    property.heating = b.heating ?? property.heating;
    property.energyClass = b.energyClass ?? property.energyClass;
    property.orientation = b.orientation ?? property.orientation;
    property.view = b.view ?? property.view;
    property.ownerNotes = b.ownerNotes ?? property.ownerNotes;

    // numbers
    property.price = setIfProvided(property.price, b.price, (v) => parseFloat(v));
    property.floor = setIfProvided(property.floor, b.floor, (v) => parseInt(v));
    property.squareMeters = setIfProvided(
      property.squareMeters,
      b.squareMeters ?? b.sqm,
      (v) => parseInt(v)
    );
    property.surface = setIfProvided(property.surface, b.surface, (v) => parseInt(v));
    property.levels = setIfProvided(property.levels, b.levels, (v) => parseInt(v));
    property.bedrooms = setIfProvided(property.bedrooms, b.bedrooms, (v) => parseInt(v));
    property.bathrooms = setIfProvided(property.bathrooms, b.bathrooms, (v) => parseInt(v));
    property.wc = setIfProvided(property.wc, b.wc, (v) => parseInt(v));
    property.kitchens = setIfProvided(property.kitchens, b.kitchens, (v) => parseInt(v));
    property.livingRooms = setIfProvided(property.livingRooms, b.livingRooms, (v) => parseInt(v));
    property.parkingSpaces = setIfProvided(
      property.parkingSpaces,
      b.parkingSpaces,
      (v) => parseInt(v)
    );
    property.monthlyMaintenanceFee = setIfProvided(
      property.monthlyMaintenanceFee,
      b.monthlyMaintenanceFee,
      (v) => parseFloat(v)
    );
    property.constructionYear = setIfProvided(
      property.constructionYear,
      b.constructionYear,
      (v) => parseInt(v)
    );
    property.renovationYear = setIfProvided(
      property.renovationYear,
      b.renovationYear,
      (v) => parseInt(v)
    );
    property.latitude = setIfProvided(property.latitude, b.latitude, Number);
    property.longitude = setIfProvided(property.longitude, b.longitude, Number);

    // booleans
    if (b.onTopFloor !== undefined) {
      property.onTopFloor =
        b.onTopFloor === true ||
        b.onTopFloor === "true" ||
        b.onTopFloor === "yes" ||
        b.onTopFloor === "1";
    }
    if (b.hasElevator !== undefined) {
      property.hasElevator = b.hasElevator === "true" || b.hasElevator === true;
    }
    if (b.hasStorage !== undefined) {
      property.hasStorage = b.hasStorage === "true" || b.hasStorage === true;
    }
    if (b.furnished !== undefined) {
      property.furnished = b.furnished === "true" || b.furnished === true;
    }
    if (b.petsAllowed !== undefined) {
      property.petsAllowed = b.petsAllowed === "true" || b.petsAllowed === true;
    }
    if (b.smokingAllowed !== undefined) {
      property.smokingAllowed = b.smokingAllowed === "true" || b.smokingAllowed === true;
    }
    if (b.insulation !== undefined) {
      property.insulation = b.insulation === "true" || b.insulation === true;
    }

    // arrays
    if (b.features !== undefined || b["features[]"] !== undefined) {
      const ft =
        Array.isArray(b["features[]"])
          ? b["features[]"]
          : Array.isArray(b.features)
          ? b.features
          : b.features
          ? [b.features]
          : [];
      property.features = ft;
    }

    // images
    if (newImages && newImages.length) {
      property.images = [...(property.images || []), ...newImages];
    }
    if (floorPlanImage) {
      property.floorPlanImage = floorPlanImage;
    }

    // tenant requirements
    if (b.tenantRequirements !== undefined) {
      property.tenantRequirements =
        typeof b.tenantRequirements === "string"
          ? JSON.parse(b.tenantRequirements)
          : b.tenantRequirements || {};
    }

    await property.save();
    res.json({ message: "Property updated", property });
  } catch (err) {
    console.error("❌ updateProperty error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* --------------------------- DELETE PROPERTY --------------------------- */
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
