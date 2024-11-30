const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const { isAdmin, isLoggedIn } = require('../middleware/authMiddleware');

// Login page
router.get('/login', (req, res) => {
    res.render('login');  // Make sure this path matches your view directory structure
});

// Login process
router.post('/login', async (req, res) => {
    const { email, password, rememberPassword } = req.body;

    try {
        // Find admin by email
        const admin = await Admin.findOne({ email });
        
        if (!admin) {
            return res.json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if admin is active
        if (!admin.isActive) {
            return res.json({
                success: false,
                message: 'Your account is deactivated'
            });
        }

        // Verify password
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Store admin in session
        req.session.admin = {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role
        };

        // If remember me is checked, extend session
        if (rememberPassword) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }

        res.json({
            success: true,
            message: 'Login successful',
            redirectUrl: 'dashboard'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.json({
            success: false,
            message: 'Server error, please try again'
        });
    }
});

// Dashboard
router.get('/dashboard', isAdmin, (req, res) => {
    res.render('dashboard', { 
        admin: req.session.admin 
    });
});

// Logout
router.get('/logout', isAdmin, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.json({
                success: false,
                message: 'Error logging out'
            });
        }
        res.json({
            success: true,
            redirectUrl: '/admin/login'
        });
    });
});

module.exports = router;