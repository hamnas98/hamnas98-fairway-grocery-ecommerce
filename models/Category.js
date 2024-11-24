const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    image: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
    isBlocked: { 
      type: Boolean, 
      default: false 
    }
}, { timestamps: true });




const Category =  mongoose.model('Category', categorySchema);

module.exports = Category;