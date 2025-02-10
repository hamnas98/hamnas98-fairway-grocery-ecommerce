const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: false,
        unique: true
    },
    password: {
        type: String,
        required: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },

    isBlocked: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    blockedAt: {
         type: Date 
    },
    deletedAt: { 
        type: Date 
    },
    googleId: {
        type: String,
        sparse: true, 
        unique: true   
      },
}, { timestamps: true });

// Hash & Salt password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });

module.exports = mongoose.model('User', userSchema);