const Admin = require('../../models/Admin');
const bcrypt = require('bcryptjs');


    // Login Page
const getLoginPage =  (req, res) => {

        try {
            if (req.session.admin) {
                return res.redirect('/admin/dashboard');
            }
            res.render('login', { pageTitle: 'Admin Login' });
            

        } catch (error) {
            console.error('Login page error:', error);
            res.status(500).send('Server error');
        }
};

const login = async (req, res) => {
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

        // Save session before sending response
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.json({
                    success: false,
                    message: 'Login failed'
                });
            }

            res.json({
                success: true,
                message: 'Login successful',
                redirectUrl: '/admin/dashboard'
            });
        });

    } catch (error) {
        console.error('Login error:', error);
        res.json({
            success: false,
            message: 'Server error, please try again'
        });
    }
};
    // Dashboard
const getDashboard = async (req, res) => {
        try {
            res.render('dashboard', {
                admin: req.session.admin,
                path: '/admin/dashboard'
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).send('Server error');
        }
};

const logout = (req, res) => {
    try {
    
        req.session.admin = null;
        
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error logging out'
                });
            }

            // Clear any cookies
            res.clearCookie('connect.sid');
            
            res.json({
                success: true,
                redirectUrl: '/admin/login'
            });
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging out'
        });
    }
};

module.exports = { getLoginPage, login, getDashboard , logout };