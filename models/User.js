const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Ensure that email is unique
  },
  password: {
    type: String,
    required: false, // Password is not required if signing up via Google
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
  phone: {
    type: String,
    sparse: true,  // Allow sparse indexing for phone numbers
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false, // Track if user has verified their email
  },
  isBlocked: { 
    type: Boolean, 
    default: false 
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  

});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;