const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/pictures/'),
  filename: (req, file, cb) => {
    // Never trust the client-supplied filename — generate a random one
    // and keep only a whitelisted extension.
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${crypto.randomBytes(16).toString('hex')}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, or WEBP images are allowed.'));
  }
  cb(null, true);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
});
