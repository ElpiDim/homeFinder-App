const express = require("express");
const router = express.Router();
const favoritesController = require("../controllers/favoritesController");
const verifyToken = require("../middlewares/authMiddleware");

router.post("/", verifyToken, favoritesController.addFavorite);
router.get("/", verifyToken, favoritesController.getFavorites);
router.delete("/:propertyId", verifyToken, favoritesController.deleteFavorite);

module.exports = router;
