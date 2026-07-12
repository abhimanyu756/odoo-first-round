const path = require('path');
const fs = require('fs');
const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const uploadRoot = path.join(__dirname, '..', '..', env.uploads.dir);
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadRoot),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '_')
      .slice(0, 40);
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const ALLOWED = /^(image\/(png|jpe?g|webp|gif)|application\/pdf)$/;

function fileFilter(req, file, cb) {
  if (ALLOWED.test(file.mimetype)) return cb(null, true);
  cb(ApiError.badRequest('Only images and PDF files are allowed'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.uploads.maxMb * 1024 * 1024 },
});

// Public URL path for a stored file (served statically from /uploads).
const publicUrl = (filename) => `/${env.uploads.dir}/${filename}`;

module.exports = { upload, publicUrl, uploadRoot };
