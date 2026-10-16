const multer = require('multer');
const { AppError } = require('../utils/errors');
module.exports = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(/\.json$/i.test(file.originalname) ? null : new AppError(400, 'Upload a .json file.'), /\.json$/i.test(file.originalname))
});
