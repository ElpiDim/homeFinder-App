const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const multer = require("multer");
const propertyController = require("../controllers/propertyController");
const Property = require("../models/property");




router.get("/", propertyController.getAllProperties);


router.post("/", verifyToken, upload.array("images", 5), propertyController.createProperty);

//get by id 
router.get("/:propertyId", propertyController.getPropertyById);

//delete pproperty 
router.delete('/:propertyId', verifyToken, propertyController.deleteProperty);

//edit property 
router.put('/:propertyId', verifyToken, upload.array("images", 5), propertyController.updateProperty);


module.exports = router; 