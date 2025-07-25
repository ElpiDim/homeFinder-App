// controllers/propertyController.js
const Property = require("../models/property");

// Δημιουργία property
exports.createProperty = async (req, res) => {
  const ownerId = req.user.userId;

  if (req.user.role !== "owner") {
    return res.status(403).json({ message: "Only owners can add properties" });
  }

  try {
    const newProperty = new Property({
      ...req.body,
      ownerId
    });

    await newProperty.save();
    res.status(201).json({ message: "Property created", property: newProperty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Λήψη όλων των properties
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

//get property by id 
exports.getPropertyById = async (req, res)=> {
  try{
    const property = await Property.findById(req.params.propertyId).populate("ownerId");

    if(!property) return res.status(404).json({message: "property not found"});
    res.json(property);
  }catch(err){
    console.error(err);
    res.status(500).json({message: "server error"});
  }
};
