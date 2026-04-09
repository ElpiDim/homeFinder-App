const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const hasCloudinaryConfig =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

// local storage fallback
const diskStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

// cloudinary storage (default when env vars are provided)
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const isFloorPlan = file.fieldname === "floorPlanImage";
    return {
      folder: isFloorPlan ? "homefinder/floorplans" : "homefinder/properties",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ quality: "auto:good" }],
    };
  },
});

const storage = hasCloudinaryConfig ? cloudinaryStorage : diskStorage;

if (!hasCloudinaryConfig) {
  console.warn(
    "⚠️ Cloudinary env vars are missing. Falling back to local /uploads storage."
  );
}

// only images
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
  limits: { fileSize: 2 * 1024 * 1024 },
});

const uploadImages = upload.array("images", 5);
const uploadProfilePicture = upload.single("profilePicture");

const uploadFields = upload.fields([
  { name: "images", maxCount: 20 },
  { name: "floorPlanImage", maxCount: 1 },
]);

module.exports = {
  uploadImages,
  uploadProfilePicture,
  uploadFields,
};
