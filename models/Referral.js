const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    code: {
        type: String,
        unique: true
    },  
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }, 
    referredUsers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        purchaseCompleted: {
            type: Boolean,
            default: false
        },
        rewardClaimed: {
            type: Boolean,
            default: false
        }
    }],
    totalEarnings: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Referral', referralSchema);