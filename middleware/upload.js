//middleware/upload.js
const multer = require('multer');
const MAX_MB = Number(process.env.MAX_UPLOAD_SIZE_MB || 5);
const MAX_BYTES = MAX_MB * 1024 * 1024;
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  // accept images only
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};
const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter,
});
module.exports = upload;