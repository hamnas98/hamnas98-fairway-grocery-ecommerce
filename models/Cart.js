const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
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
    }
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [cartItemSchema],
    total: {
        type: Number,
        default: 0
    },
    discountTotal: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Calculate totals before saving
cartSchema.pre('save', async function(next) {
    this.total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.discountTotal = this.items.reduce((sum, item) => {
        const itemTotal = item.discountPrice ? 
            item.discountPrice * item.quantity : 
            item.price * item.quantity;
        return sum + itemTotal;
    }, 0);
    next();
});

module.exports = mongoose.model('Cart', cartSchema);