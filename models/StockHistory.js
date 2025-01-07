// models/StockHistory.js
const mongoose = require('mongoose');

const stockHistorySchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    updateType: {
        type: String,
        enum: ['add', 'subtract', 'set'],
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    previousStock: {
        type: Number,
        required: true
    },
    newStock: {
        type: Number,
        required: true
    },
    notes: String,
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: false
    }
}, { timestamps: true });

module.exports = mongoose.model('StockHistory', stockHistorySchema);