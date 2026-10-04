const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    readFileBuffer,
    matchesFileSignature
} = require('./fileSignature');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

    const mimeTypeToExtension = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp'
    };

    const extension = mimeTypeToExtension[file.mimetype];

    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});
// Create multer instance with file size and MIME type limits
const allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp'
]);

const isAllowedMimeType = (mimeType) => {
    return allowedMimeTypes.has(mimeType);
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (isAllowedMimeType(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed!'), false);
        }
    }
});

const uploadSingle = (fieldName) => {
    const multerMiddleware = upload.single(fieldName);

    return (req, res, next) => {
        multerMiddleware(req, res, (err) => {
            if (err) {
    err.statusCode = 400;
    return next(err);
	    }

            if (!req.file) {
                return next();
            }

            try {
                const fileBuffer = readFileBuffer(req.file.path);
                const isValid = matchesFileSignature(
                    fileBuffer,
                    req.file.mimetype
                );

                if (!isValid) {
                    fs.unlinkSync(req.file.path);
                    req.file = undefined;

                    const error = new Error(
                        'Uploaded file content does not match its declared type.'
                    );
                    error.statusCode = 400;

                    return next(error);
                }

                return next();
            } catch (error) {
                if (req.file?.path && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }

                req.file = undefined;
                return next(error);
            }
        });
    };
};

module.exports = {
    single: uploadSingle,
    isAllowedMimeType
};
