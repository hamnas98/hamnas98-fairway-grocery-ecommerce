// models/SearchHistory.js
const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
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

// Instead of a unique compound index, use this index for better performance
searchHistorySchema.index({ userId: 1, timestamp: -1 });

// Static method to add search and maintain history size
searchHistorySchema.statics.addSearch = async function(userId, query) {
    const maxHistorySize = 10; // Keep last 10 searches
    
    // Find if this exact search already exists
    const existingSearch = await this.findOne({ 
        userId, 
        query: query.trim() 
    });

    if (existingSearch) {
        // Update timestamp of existing search
        await this.findByIdAndUpdate(existingSearch._id, {
            timestamp: new Date()
        });
    } else {
        // Add new search
        await this.create({ userId, query: query.trim() });
        
        // Get count of user's searches
        const count = await this.countDocuments({ userId });
        
        // If more than max, delete oldest
        if (count > maxHistorySize) {
            const oldest = await this.find({ userId })
                .sort({ timestamp: 1 })
                .limit(count - maxHistorySize);
                
            if (oldest.length > 0) {
                await this.deleteMany({ 
                    _id: { $in: oldest.map(doc => doc._id) }
                });
            }
        }
    }
};

module.exports = mongoose.model('SearchHistory', searchHistorySchema);