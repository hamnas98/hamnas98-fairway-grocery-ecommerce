const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  offerPrice: {
    type: Number,
    required: true,
    min: 0
  },
  productImages: [
    {
      type: String,
      required: true
    }
  ], // Array to store multiple images
  description: {
    type: String,
    trim: true
  },
  ratings: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review'
    }
  ],
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Available', 'Out of Stock', 'Sold Out'],
    required: true,
    default: 'Available'
  },
  highlights: [String], // Array for product highlights/specs
  relatedProducts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }
  ],
  tags: [String], // Tags for easier filtering (e.g., organic, fresh, premium)
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'pcs', 'bundle', 'litre']
  },
  weight: {
    type: Number, // Allows specifying weight for products
    required: false,
    min: 0
  },
  shelfLife: {
    type: String, // Example: "3 days", "1 week"
    required: false
  },
  expiryDate: {
    type: Date // Expiry date for perishable items
  }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
