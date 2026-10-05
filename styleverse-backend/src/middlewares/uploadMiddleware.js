const multer = require("multer");

const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(
      new Error(
        "Only JPG, PNG and WEBP images are allowed"
      )
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter,
});

module.exports = upload;