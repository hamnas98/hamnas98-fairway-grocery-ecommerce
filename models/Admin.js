const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phone: {
        type: String,
        sparse: true,
        default: null,
        required:false
      },
    role: { type: String, default: 'admin' }, // Role to distinguish admin users
});

adminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});


const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;

