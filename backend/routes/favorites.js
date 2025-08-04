const express = require("express");
const router = express.Router();
const favoritesController = require("../controllers/favoritesController");
const verifyToken  = require("../middlewares/authMiddleware");
const path = require('path');

console.log("verifyToken type:", typeof verifyToken);
console.log("addFavorite type:", typeof favoritesController.addFavorite);
console.log("getFavorites type:", typeof favoritesController.getFavorites);
console.log("deleteFavorite type:", typeof favoritesController.deleteFavorite);
router.post("/", verifyToken, favoritesController.addFavorite);
router.get("/", verifyToken, favoritesController.getFavorites);
router.delete("/:propertyId", verifyToken, favoritesController.deleteFavorite);

console.log("==loading controller from:",path.resolve(__dirname,'../controllers/favoritesController'));
module.exports = router;
