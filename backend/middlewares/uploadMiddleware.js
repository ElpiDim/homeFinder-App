// backend/middlewares/uploadMiddleware.js
const multer = require("multer");
const path = require("path");

// --- Storage config ---
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, "uploads/"); // φάκελος αποθήκευσης
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // π.χ. 16925555664.jpg
  },
});

// --- Only allow images ---
const fileFilter = (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB όριο
});

// ----- Middlewares -----
// πολλές εικόνες (μέχρι 5)
const uploadImages = upload.array("images", 5);

// profile picture
const uploadProfilePicture = upload.single("profilePicture");

// ✅ images + floorPlanImage (η νέα που χρειάζεσαι)
const uploadFields = upload.fields([
  { name: "images", maxCount: 20 },        // gallery
  { name: "floorPlanImage", maxCount: 1 }, // κάτοψη
]);

module.exports = {
  uploadImages,
  uploadProfilePicture,
  uploadFields, // <-- πρόσθεσε αυτό για create/update property
};
