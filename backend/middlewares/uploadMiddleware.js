const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ο φάκελος όπου θα αποθηκεύονται τα αρχεία
  }, 
  filename: function(req, file, cb) {
    // Αποθήκευση του αρχείου με το όνομά του
    const uniqueName = Date.now()+ path.extname(file.originalname);
    cb(null, uniqueName);
  }, 
});

const upload = multer({storage});

module.exports = upload;