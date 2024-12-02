const multer = require('multer');
const path = require('path');

// Storage configuration for different file types
const categorystorage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'public/uploads/categories');
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
        }
});

// Storage configuration for products
const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/products');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});




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
        storage: categorystorage,
        limits: { fileSize: 1024 * 1024 * 2 }, // 2MB limit
        fileFilter: fileFilter
    }).single('image'),

    productUpload: multer({
        storage: productStorage,
        limits: { 
            fileSize: 1024 * 1024 * 5, // 5MB limit
            files: 5 // Maximum 5 files
        },
        fileFilter: fileFilter
    }).array('images', 5)

};


