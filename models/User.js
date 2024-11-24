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
    sparse: true,
    default: null,
    required:false
  },
  isBlocked: { 
    type: Boolean, 
    default: false 
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  googleId: { 
    type: String, 
    unique: true ,
    dafault:null
  },

});
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
const User = mongoose.model('User', userSchema);
module.exports = User;
