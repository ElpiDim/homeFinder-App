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

const arrFrom = (v) =>
  Array.isArray(v) ? v : hasValue(v) ? [v] : [];

const truthy = (v) =>
  v === true || v === "true" || v === "yes" || v === "1";

const maybeEnum = (val) => (hasValue(val) ? val : undefined);

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
      squareMeters: toNum(b.squareMeters, parseInt),
      surface: toNum(b.surface, parseInt),
      onTopFloor: truthy(b.onTopFloor),
      levels: toNum(b.levels, parseInt),
      bedrooms: toNum(b.bedrooms, parseInt),
      bathrooms: toNum(b.bathrooms, parseInt),
      wc: toNum(b.wc, parseInt),
      kitchens: toNum(b.kitchens, parseInt),
      livingRooms: toNum(b.livingRooms, parseInt),

      /* extended attributes */
      plotSize: toNum(b.plotSize, parseFloat),
      yearBuilt: toNum(b.yearBuilt, parseInt),
      condition: maybeEnum(b.condition),
      hasElevator: truthy(b.hasElevator),
      hasStorage: truthy(b.hasStorage),
      furnished: truthy(b.furnished),
      heating: maybeEnum(b.heating),
      energyClass: maybeEnum(b.energyClass),
      orientation: maybeEnum(b.orientation),
      petsAllowed: truthy(b.petsAllowed),
      smokingAllowed: truthy(b.smokingAllowed),
      parkingSpaces: toNum(b.parkingSpaces, parseInt),
      monthlyMaintenanceFee: toNum(b.monthlyMaintenanceFee, parseFloat),
      view: maybeEnum(b.view),
      insulation: truthy(b.insulation),
      ownerNotes: b.ownerNotes,

      // ✅ nested tenant requirements (αν λείπουν, δεν αποθηκεύονται)
      tenantRequirements: {
        minTenantSalary: toNum(
          b.minTenantSalary ?? b["tenantRequirements.minTenantSalary"],
          parseFloat
        ),
        minAge: toNum(
          b.minAge ?? b["tenantRequirements.minAge"],
          parseInt
        ),
        maxOccupants: toNum(
          b.maxOccupants ?? b["tenantRequirements.maxOccupants"],
          parseInt
        ),
        petsAllowed: hasValue(b.petsAllowedReq ?? b["tenantRequirements.petsAllowed"])
          ? truthy(b.petsAllowedReq ?? b["tenantRequirements.petsAllowed"])
          : undefined,
        smokingAllowed: hasValue(b.smokingAllowedReq ?? b["tenantRequirements.smokingAllowed"])
          ? truthy(b.smokingAllowedReq ?? b["tenantRequirements.smokingAllowed"])
          : undefined,
        allowedOccupations: arrFrom(
          b["allowedOccupations[]"] ??
          b.allowedOccupations ??
          b["tenantRequirements.allowedOccupations[]"] ??
          b["tenantRequirements.allowedOccupations"]
        ),
      },

      /* arrays */
      features: arrFrom(b["features[]"] ?? b.features),

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
      q,                    // text in title/location
      type,                 // rent|sale
      minPrice, maxPrice,
      minSqm, maxSqm,
      minBedrooms, maxBedrooms,
      minBathrooms, maxBathrooms,
      yearFrom, yearTo,
      furnished, petsAllowed, hasElevator, hasStorage,
      energyClass, heating, orientation, view,
      sort = "relevance",   // relevance | newest | price_asc | price_desc | likes
      lat, lng,
      page = 1,
      limit = 24,
    } = req.query;

    const numericLimit = Math.max(1, Math.min(100, parseInt(limit) || 24));
    const numericPage = Math.max(1, parseInt(page) || 1);
    const skip = (numericPage - 1) * numericLimit;

    const match = {};

    // free text
    if (hasValue(q)) {
      const rx = new RegExp(`${q}`.trim(), "i");
      match.$or = [{ title: rx }, { location: rx }, { address: rx }];
    }

    if (type) match.type = type;

    // price range
    if (hasValue(minPrice) || hasValue(maxPrice)) {
      match.price = {};
      if (hasValue(minPrice)) match.price.$gte = parseFloat(minPrice);
      if (hasValue(maxPrice)) match.price.$lte = parseFloat(maxPrice);
    }

    // bedrooms/bathrooms range
    const numRange = (field, minV, maxV) => {
      if (!hasValue(minV) && !hasValue(maxV)) return null;
      const r = {};
      if (hasValue(minV)) r.$gte = parseInt(minV);
      if (hasValue(maxV)) r.$lte = parseInt(maxV);
      return { [field]: r };
    };
    Object.assign(
      match,
      numRange("bedrooms", minBedrooms, maxBedrooms) || {},
      numRange("bathrooms", minBathrooms, maxBathrooms) || {}
    );

    // year built
    if (hasValue(yearFrom) || hasValue(yearTo)) {
      match.yearBuilt = {};
      if (hasValue(yearFrom)) match.yearBuilt.$gte = parseInt(yearFrom);
      if (hasValue(yearTo)) match.yearBuilt.$lte = parseInt(yearTo);
    }

    // simple flags
    const boolEq = (key, val) =>
      hasValue(val)
        ? { [key]: val === "true" || val === true || val === "1" }
        : null;

    Object.assign(
      match,
      boolEq("furnished", furnished) || {},
      boolEq("petsAllowed", petsAllowed) || {},
      boolEq("hasElevator", hasElevator) || {},
      boolEq("hasStorage", hasStorage) || {}
    );

    // enums/text equals (προστασία από κενές τιμές)
    if (hasValue(energyClass)) match.energyClass = maybeEnum(energyClass);
    if (hasValue(heating)) match.heating = maybeEnum(heating);
    if (hasValue(orientation)) match.orientation = maybeEnum(orientation);
    if (hasValue(view)) match.view = maybeEnum(view);

    // ✅ filter properties based on tenant profile (client = tenant)
    if (req.user?.role === "client") {
      const currentUser = await User.findById(req.user.userId).select(
        "salary occupation age householdSize hasPets smoker"
      );

      if (currentUser) {
        const salary = currentUser.salary ?? 0;
        const occ = currentUser.occupation;
        const age = currentUser.age;
        const hh = currentUser.householdSize ?? 1;
        const hasPetsProfile = !!currentUser.hasPets;
        const smokerProfile = !!currentUser.smoker;

        match.$and = [
          ...(match.$and || []),

          // min salary
          {
            $or: [
              { "tenantRequirements.minTenantSalary": { $exists: false } },
              { "tenantRequirements.minTenantSalary": { $lte: salary } },
            ],
          },

          // allowed occupations
          {
            $or: [
              { "tenantRequirements.allowedOccupations": { $exists: false } },
              { "tenantRequirements.allowedOccupations": { $size: 0 } },
              { "tenantRequirements.allowedOccupations": occ },
            ],
          },

          // minAge
          ...(hasValue(age)
            ? [{
                $or: [
                  { "tenantRequirements.minAge": { $exists: false } },
                  { "tenantRequirements.minAge": { $lte: age } },
                ],
              }]
            : []),

          // maxOccupants
          ...(hasValue(hh)
            ? [{
                $or: [
                  { "tenantRequirements.maxOccupants": { $exists: false } },
                  { "tenantRequirements.maxOccupants": { $gte: hh } },
                ],
              }]
            : []),

          // petsAllowed requirement
          ...(hasPetsProfile
            ? [{
                $or: [
                  { "tenantRequirements.petsAllowed": { $exists: false } },
                  { "tenantRequirements.petsAllowed": true },
                ],
              }]
            : []),

          // smokingAllowed requirement
          ...(smokerProfile
            ? [{
                $or: [
                  { "tenantRequirements.smokingAllowed": { $exists: false } },
                  { "tenantRequirements.smokingAllowed": true },
                ],
              }]
            : []),
        ];
      }
    }

    // sqm filter via $expr to tolerate stringy data
    let sqmMatchStage = null;
    if (hasValue(minSqm) || hasValue(maxSqm)) {
      const min = hasValue(minSqm) ? parseInt(minSqm) : undefined;
      const max = hasValue(maxSqm) ? parseInt(maxSqm) : undefined;
      const sqrExpr = [];
      const surfExpr = [];
      if (min !== undefined) {
        sqrExpr.push({
          $gte: [{ $toDouble: "$squareMeters" }, min],
        });
        surfExpr.push({
          $gte: [{ $toDouble: "$surface" }, min],
        });
      }
      if (max !== undefined) {
        sqrExpr.push({
          $lte: [{ $toDouble: "$squareMeters" }, max],
        });
        surfExpr.push({
          $lte: [{ $toDouble: "$surface" }, max],
        });
      }
      sqmMatchStage = {
        $match: {
          $or: [{ $expr: { $and: sqrExpr } }, { $expr: { $and: surfExpr } }],
        },
      };
    }

    // coords
    const hasCoords = hasValue(lat) && hasValue(lng);
    const userLat = hasCoords ? Number(lat) : null;
    const userLng = hasCoords ? Number(lng) : null;
    const distanceExpr = hasCoords
      ? {
          $multiply: [
            111.32,
            {
              $sqrt: {
                $add: [
                  { $pow: [{ $subtract: [{ $toDouble: "$latitude" }, userLat] }, 2] },
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
      ...(sqmMatchStage ? [sqmMatchStage] : []),
      { $match: match },
      {
        $lookup: {
          from: "favorites",
          localField: "_id",
          foreignField: "propertyId",
          as: "favDocs",
        },
      },
      { $addFields: { favoritesCount: { $size: "$favDocs" } } },
      ...(hasCoords ? [{ $addFields: { distanceKm: distanceExpr } }] : []),
    ];

    // sorting
    if (sort === "newest") {
      pipeline.push({ $sort: { createdAt: -1 } });
    } else if (sort === "price_asc") {
      pipeline.push({ $sort: { price: 1, createdAt: -1 } });
    } else if (sort === "price_desc") {
      pipeline.push({ $sort: { price: -1, createdAt: -1 } });
    } else if (sort === "likes") {
      pipeline.push({ $sort: { favoritesCount: -1, createdAt: -1 } });
    } else {
      pipeline.push({
        $sort: hasCoords
          ? { distanceKm: 1, favoritesCount: -1, createdAt: -1 }
          : { favoritesCount: -1, createdAt: -1 },
      });
    }

    // pagination
    pipeline.push({ $skip: skip }, { $limit: numericLimit });
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
      return res.status(403).json({ message: "Only owners can view their properties" });
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
      const interestMap = new Map(interestsAgg.map((i) => [String(i._id), i.count]));

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
    const property = await Property.findById(req.params.propertyId).populate("ownerId");
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Optional: αν ο ρόλος είναι tenant, μπορείς εδώ να ξανακάνεις eligibility check
    // για απευθείας access σε /properties/:id (ασφάλεια).
    // Αν δεν είναι eligible, γύρνα 403.

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

    // strings (μην γράφεις undefined στα enum — απλά αγνόησε αν είναι κενό)
    if (b.title !== undefined) property.title = b.title ?? property.title;
    if (b.location !== undefined) property.location = b.location ?? property.location;
    if (b.type !== undefined) property.type = b.type ?? property.type;
    if (b.status !== undefined) property.status = b.status ?? property.status;
    if (b.description !== undefined) property.description = b.description ?? property.description;
    if (b.address !== undefined) property.address = b.address ?? property.address;

    if (b.condition !== undefined && hasValue(b.condition)) property.condition = b.condition;
    if (b.heating !== undefined && hasValue(b.heating)) property.heating = b.heating;
    if (b.energyClass !== undefined && hasValue(b.energyClass)) property.energyClass = b.energyClass;
    if (b.orientation !== undefined && hasValue(b.orientation)) property.orientation = b.orientation;
    if (b.view !== undefined && hasValue(b.view)) property.view = b.view;

    if (b.ownerNotes !== undefined) property.ownerNotes = b.ownerNotes ?? property.ownerNotes;

    // numbers
    property.price = setIfProvided(property.price, b.price, parseFloat);
    property.floor = setIfProvided(property.floor, b.floor, (v) => parseInt(v));
    property.squareMeters = setIfProvided(property.squareMeters, b.squareMeters, (v) => parseInt(v));
    property.surface = setIfProvided(property.surface, b.surface, (v) => parseInt(v));
    property.levels = setIfProvided(property.levels, b.levels, (v) => parseInt(v));
    property.bedrooms = setIfProvided(property.bedrooms, b.bedrooms, (v) => parseInt(v));
    property.bathrooms = setIfProvided(property.bathrooms, b.bathrooms, (v) => parseInt(v));
    property.wc = setIfProvided(property.wc, b.wc, (v) => parseInt(v));
    property.kitchens = setIfProvided(property.kitchens, b.kitchens, (v) => parseInt(v));
    property.livingRooms = setIfProvided(property.livingRooms, b.livingRooms, (v) => parseInt(v));
    property.parkingSpaces = setIfProvided(property.parkingSpaces, b.parkingSpaces, (v) => parseInt(v));
    property.monthlyMaintenanceFee = setIfProvided(
      property.monthlyMaintenanceFee,
      b.monthlyMaintenanceFee,
      (v) => parseFloat(v)
    );
    property.plotSize = setIfProvided(property.plotSize, b.plotSize, parseFloat);
    property.yearBuilt = setIfProvided(property.yearBuilt, b.yearBuilt, (v) => parseInt(v));

    // geo
    property.latitude = setIfProvided(property.latitude, b.latitude, Number);
    property.longitude = setIfProvided(property.longitude, b.longitude, Number);

    // booleans
    if (b.onTopFloor !== undefined) property.onTopFloor = truthy(b.onTopFloor);
    if (b.hasElevator !== undefined) property.hasElevator = truthy(b.hasElevator);
    if (b.hasStorage !== undefined) property.hasStorage = truthy(b.hasStorage);
    if (b.furnished !== undefined) property.furnished = truthy(b.furnished);
    if (b.petsAllowed !== undefined) property.petsAllowed = truthy(b.petsAllowed);
    if (b.smokingAllowed !== undefined) property.smokingAllowed = truthy(b.smokingAllowed);
    if (b.insulation !== undefined) property.insulation = truthy(b.insulation);

    // arrays
    if (b["features[]"] !== undefined || b.features !== undefined) {
      property.features = arrFrom(b["features[]"] ?? b.features);
    }

    // --- tenantRequirements ---
    const tr = property.tenantRequirements || {};

    if (b.minTenantSalary !== undefined || b["tenantRequirements.minTenantSalary"] !== undefined) {
      const v = toNum(b.minTenantSalary ?? b["tenantRequirements.minTenantSalary"], parseFloat);
      if (v !== undefined) tr.minTenantSalary = v;
    }

    if (b.minAge !== undefined || b["tenantRequirements.minAge"] !== undefined) {
      const v = toNum(b.minAge ?? b["tenantRequirements.minAge"], parseInt);
      if (v !== undefined) tr.minAge = v;
    }

    if (b.maxOccupants !== undefined || b["tenantRequirements.maxOccupants"] !== undefined) {
      const v = toNum(b.maxOccupants ?? b["tenantRequirements.maxOccupants"], parseInt);
      if (v !== undefined) tr.maxOccupants = v;
    }

    if (b.petsAllowedReq !== undefined || b["tenantRequirements.petsAllowed"] !== undefined) {
      const v = b.petsAllowedReq ?? b["tenantRequirements.petsAllowed"];
      tr.petsAllowed = truthy(v);
    }

    if (b.smokingAllowedReq !== undefined || b["tenantRequirements.smokingAllowed"] !== undefined) {
      const v = b.smokingAllowedReq ?? b["tenantRequirements.smokingAllowed"];
      tr.smokingAllowed = truthy(v);
    }

    if (
      b["allowedOccupations[]"] !== undefined ||
      b.allowedOccupations !== undefined ||
      b["tenantRequirements.allowedOccupations[]"] !== undefined ||
      b["tenantRequirements.allowedOccupations"] !== undefined
    ) {
      tr.allowedOccupations = arrFrom(
        b["allowedOccupations[]"] ??
        b.allowedOccupations ??
        b["tenantRequirements.allowedOccupations[]"] ??
        b["tenantRequirements.allowedOccupations"]
      );
    }

    property.tenantRequirements = tr;

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
