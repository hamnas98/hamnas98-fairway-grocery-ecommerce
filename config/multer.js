const multer = require('multer');
const path = require('path');

// Storage configuration for different file types
const storage = {
    // Category image storage
    category: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'public/uploads/categories');
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),

    // Product image storage
    product: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'public/uploads/products');
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),

    
};

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('Only images (jpeg, jpg, png, webp) are allowed!'));
};

// Export multer configurations for different purposes
module.exports = {
    categoryUpload: multer({
        storage: storage.category,
        limits: { fileSize: 1024 * 1024 * 2 }, // 2MB limit
        fileFilter: fileFilter
    }),

    productUpload: multer({
        storage: storage.product,
        limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
        fileFilter: fileFilter
    }),

};