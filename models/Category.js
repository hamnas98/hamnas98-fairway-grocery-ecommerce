const { type } = require('express/lib/response');
const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Reference to the parent category
    default: null // Null for top-level categories
  },
  image: {
    type: String, // Optional image for category representation
    default: null
  },
  isActive: {
    type: Boolean,
    default: true // To enable/disable category
  },
  description: {
    type: String,
    trim: true // Optional description of the category
  },
  CategoryOffer: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

const Category =  mongoose.model('Category', CategorySchema);

module.exports = Category;