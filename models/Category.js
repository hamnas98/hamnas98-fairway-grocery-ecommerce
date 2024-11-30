const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    image: { type: String, default: null },
    discount:{type:Number, required:false,default:0},
    hasBrands: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    listed: { 
      type: Boolean, 
      default: true 
    }
}, { timestamps: true });




const Category =  mongoose.model('Category', categorySchema);

module.exports = Category;