// models/SearchHistory.js
const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    },
    query: {
        type: String,
        required: true
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
});

// Keep only last 10 searches per user
searchHistorySchema.statics.limitHistorySize = async function(userId) {
    const count = await this.countDocuments({ userId });
    if (count > 10) {
        const excess = await this.find({ userId })
            .sort({ timestamp: 1 })
            .limit(count - 10);
        await this.deleteMany({ _id: { $in: excess.map(doc => doc._id) } });
    }
};

module.exports = mongoose.model('SearchHistory', searchHistorySchema);