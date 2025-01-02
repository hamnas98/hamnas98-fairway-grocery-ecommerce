// models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    },
    discountPrice: {
        type: Number
    },
    cancelled: {
        type: Boolean,
        default: false
    },
    cancelReason: {
        type: String
    },
    cancelledAt: {
        type: Date
    }
});

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [orderItemSchema],
    deliveryAddress: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'online'],
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    discountTotal: {
        type: Number,
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Partially Cancelled'],
        default: 'Pending'
    },
    cancelReason: {
        type: String
    },
    cancelledAt: {
        type: Date
    },
    processingAt: {
        type: Date
    },
    shippedAt: {
        type: Date
    },
    deliveredAt: {
        type: Date
    }
}, { timestamps: true });


module.exports = mongoose.model('Order', orderSchema);