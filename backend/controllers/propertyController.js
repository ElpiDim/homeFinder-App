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
    
    let requirements = [];
    if (b.requirements) {
      try {
        requirements = JSON.parse(b.requirements);
      } catch (e) {
        console.error("Error parsing requirements JSON:", e);
        return res
          .status(400)
          .json({ message: "Invalid requirements format. Expected a JSON string." });
      }
    }
    const newProperty = new Property({
    
      ownerId,
      title: b.title,
      description: b.description,
      location: b.location,
      address: b.address,
      price: toNum(b.price, parseFloat),

      type: b.type,
      status: b.status,
      images,
      floorPlanImage,

      squareMeters: toNum(b.squareMeters, parseInt),
      
      plotSize: toNum(b.plotSize, parseFloat),
      yearBuilt: toNum(b.yearBuilt, parseInt),
      

     requirements, 
      features: Array.isArray(b["features[]"])
        ? b["features[]"]
        : Array.isArray(b.features)
        ? b.features
        : b.features
        ? [b.features]
        : [],

        ownerNotes: b.ownerNotes,


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
       filters, // JSON string of filters
      minMatchCount, // number of filters that must match
    } = req.query;

    const numericLimit = Math.max(1, Math.min(100, parseInt(limit) || 24));
    const numericPage = Math.max(1, parseInt(page) || 1);
    const skip = (numericPage - 1) * numericLimit;

    const match = {};

    // free text search 
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
 const pipeline = [{ $match: match }];

    // Requirements matching logic
    if (filters) {
      let parsedFilters = [];
      try {
        parsedFilters = JSON.parse(filters);
      } catch (e) {
        return res.status(400).json({ message: "Invalid filters format." });
      }

      if (Array.isArray(parsedFilters) && parsedFilters.length > 0) {
        const minMatches = parseInt(minMatchCount) || 1;

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
                              // Add more complex comparison logic here if needed
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
          
            $match: {
              matchCount: { $gte: minMatches },
            },
          }
        );
      }
    }

    // Add other stages like lookups, sorting, etc.
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

  //updated fields 
    property.title = b.title ?? property.title;
    property.description = b.description ?? property.description;
    property.location = b.location ?? property.location;
     property.address = b.address ?? property.address;
    property.price = setIfProvided(property.price, b.price, parseFloat);
    property.type = b.type ?? property.type;
    property.status = b.status ?? property.status;
    property.squareMeters = setIfProvided(property.squareMeters, b.squareMeters, (v) =>
      parseInt(v)
    );
    property.plotSize = setIfProvided(property.plotSize, b.plotSize, parseFloat);
 property.yearBuilt = setIfProvided(property.yearBuilt, b.yearBuilt, (v) =>
      parseInt(v)
    );
    property.ownerNotes = b.ownerNotes ?? property.ownerNotes;
    
     // Update requirements
    if (b.requirements) {
      try {
        property.requirements = JSON.parse(b.requirements);
      } catch (e) {
        console.error("Error parsing requirements JSON:", e);
        return res
          .status(400)
          .json({ message: "Invalid requirements format. Expected a JSON string." });
      }
    }

    // features
    if (b["features[]"] !== undefined || b.features !== undefined) {
      property.features = Array.isArray(b["features[]"])
        ? b["features[]"]
        : Array.isArray(b.features)
        ? b.features
        : b.features
        ? [b.features]
        : [];
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
