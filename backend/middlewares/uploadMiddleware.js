const fs = require('fs');
const multer = require('multer');
const path = require('path');

// Πού θα αποθηκεύονται οι εικόνες


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // φάκελος όπου θα μπαίνουν οι εικόνες
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // π.χ. 16925555664.jpg
  }
});

const fileFilter = (req, file, cb) => {
  // Επιτρέπει μόνο εικόνες
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB όριο
  }
});

// Separate middlewares for different field names
const uploadImages = upload.array('images', 5);
const uploadProfilePicture = upload.single('profilePicture');

module.exports = { uploadImages, uploadProfilePicture };