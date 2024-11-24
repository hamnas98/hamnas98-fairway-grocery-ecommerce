const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const { ensureDirectoryExists } = require('../utils/fsUtils');
const configImage = require('../config/imageConfig');

// Multer memory storage
const storage = multer.memoryStorage();

// Multer upload configuration
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed (JPEG, JPG, PNG).'));
        }
    },
});

const processImages = (type) => async (req, res, next) => {
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) return next();

    try {
        const uploadDir = `public/images/upload/${type}`;
        await ensureDirectoryExists(uploadDir);

        const { width, height, quality } = configImage.image[type];
        req.processedPaths = [];
        await Promise.all(
            files.map(async (file) => {
                const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.jpeg`;
                await sharp(file.buffer)
                    .resize(width, height)
                    .jpeg({ quality })
                    .toFile(path.join(uploadDir, fileName));
                req.processedPaths.push(`${uploadDir}/${fileName}`);
            })
        );
        next();
    } catch (error) {
        console.error('Error processing images:', error);
        res.status(500).render('errorPage', { message: 'Error processing images.' });
    }
};

module.exports = {
    upload,
    processCategoryImage: processImages('category'),
    processProductImages: processImages('product'),
};
