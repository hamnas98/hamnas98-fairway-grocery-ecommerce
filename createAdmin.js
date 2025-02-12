require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/Admin');


const MONGODB_URI = process.env.MONGODB_URI;

// Predefined Admin Data
const adminData = {
    name: "Fairway",
    email: "hamnascp98@gmail.com",
    password: "fairway@123",
    phone: "9562558847",
    role: "admin"
};

// Hash the password before saving
const createAdmin = async () => {
    try {
        // Check if the admin already exists
        const adminExist = await Admin.findOne({ email: adminData.email });
        if (adminExist) {
            console.log("Admin already exists.");
            return;
        }

        // Create new admin instance
        const newAdmin = new Admin(adminData);

        // Save the admin record
        await newAdmin.save();
        console.log("Admin created successfully.");
    } catch (error) {
        console.error("Error creating admin:", error);
    } finally {
        mongoose.connection.close();
    }
};

// Connect to MongoDB and create the admin
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log("Connected to MongoDB");
    createAdmin();
})
.catch(err => {
    console.error("MongoDB connection error:", err);
});