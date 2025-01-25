// models/SalesReport.js
const mongoose = require('mongoose');

const salesReportSchema = new mongoose.Schema({
    startDate: Date,
    endDate: Date,
    totalOrders: Number,
    totalAmount: Number,
    discountAmount: Number,
    couponDiscount: Number,
    netAmount: Number,
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }]
});

module.exports = mongoose.model('SalesReport', salesReportSchema);