const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");
const propertyController = require("../controllers/propertyController");

router.post("/",verifyToken,  propertyController.createProperty);
router.get("/", propertyController.getAllProperties);

module.exports = router;

//get by id 
router.get("/:propertyId", propertyController.getPropertyById);

module.exports = router; 