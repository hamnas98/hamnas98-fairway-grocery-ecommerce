const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    listed: { type: Boolean, default: true },
    discountPrice: { type: Number, default: null }, 
    discountPercentage: { type: Number, default: 0 },
    productDiscountPrice:{ type: Number, default: null} ,
    productDiscountPercentage:{ type: Number, default: 0} ,
    stock: { type: Number, required: true, default: 0 }, // Quantity of product available
    reviews: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            rating: { type: Number, min: 1, max: 5 },
            comment: { type: String },
            createdAt: { type: Date, default: Date.now },
        }
    ],
    images: [{ type: String }], // Array to store multiple images (URLs)
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String, required: false }, // Brand is optional, only applicable if the category has brands
    isDeleted: { type: Boolean, default: false },
    soldOut: { type: Boolean, default: false }, // Sold Out / Unavailable flag
    outOfStock: { type: Boolean, default: false }, // Indicates if the product is out of stock
    highlights: [String], // Array of highlights or product specifications
    aboutProduct: [String],  // Product description or detailed info
    unit: { 
        type: String, 
        required: true, 
        enum: ['kg', 'g', 'pcs', 'bundle', 'litre','ml'] // Enum with predefined values
 // Unit of measurement (e.g., "kg", "liters", "pieces")
    },
    quantity: { 
        type: Number, 
        required: true // To store the specific value (e.g., 500 grams)
    },
   
}, { timestamps: true });








const Product = mongoose.model('Product', productSchema);
module.exports = Product;
