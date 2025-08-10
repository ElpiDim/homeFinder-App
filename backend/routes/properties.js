const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");
const {uploadImages} = require("../middlewares/uploadMiddleware");
const propertyController = require("../controllers/propertyController");
const Property = require("../models/property");




router.get("/", propertyController.getAllProperties);

router.get("/mine",verifyToken, propertyController.getMyProperties);

router.post("/", verifyToken, uploadImages, propertyController.createProperty);

//get by id 
router.get("/:propertyId", propertyController.getPropertyById);

//delete pproperty 
router.delete('/:propertyId', verifyToken, propertyController.deleteProperty);

//edit property 
router.put('/:propertyId', verifyToken, uploadImages, propertyController.updateProperty);


module.exports = router; 