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
    },
    returned: {
        type: Boolean,
        default: false
    },
    returnedAt: Date,
    returnReason: String,
    returnDescription: String,
    returnStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
        default: 'Pending'
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
        enum: ['cod', 'razorpay'],
        required: true
    },
    paymentDetails: {
        razorpayOrderId: String,
        razorpayPaymentId: String,
        razorpaySignature: String,
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending'
        },
        paidAt: Date
    },
    total: {
        type: Number,
        required: true
    },
    discountTotal: {
        type: Number,
        required: true
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon'
    },
    couponDiscount: {
        type: Number,
        default: 0
    },
    orderStatus: {
        type: String,
        enum: [
            'Pending', 
            'Processing', 
            'Shipped', 
            'Delivered', 
            'Cancelled', 
            'Partially Cancelled',
            'Return Pending',
            'Return Processing',
            'Return Completed',
            'Return Rejected',
            'Partially Returned'
        ],
        default: 'Pending'
    },
    cancelReason: {
        type: String
    },
    cancelledAt: {
        type: Date
    },
    refundDetails: {
        amount: Number,
        processedAt: Date,
        status: {
            type: String,
            enum: ['Pending', 'Completed', 'Failed'],
            default: 'Pending'
        },
        walletTransactionId: mongoose.Schema.Types.ObjectId
    },
    processingAt: {
        type: Date
    },
    shippedAt: {
        type: Date
    },
    deliveredAt: {
        type: Date
    },
    returnDetails: {
        isReturned: {
            type: Boolean,
            default: false
        },
        returnedAt: Date,
        status: {
            type: String,
            enum: ['Pending', 'Processing', 'Completed', 'Rejected'],
            default: 'Pending'
        },
        refundAmount: Number,
        refundStatus: {
            type: String,
            enum: ['Pending', 'Completed', 'Failed','Rejected']
        },
        rejectionReason: String 
    }
}, { timestamps: true });


orderSchema.index({ 'paymentDetails.razorpayOrderId': 1 });
orderSchema.index({ 'paymentDetails.razorpayPaymentId': 1 });

module.exports = mongoose.model('Order', orderSchema);