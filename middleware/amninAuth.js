const Admin = require('../models/Admin')

const adminAuth = async (req, res, next) => {
    try {
        // Add no-cache headers
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        // Check if accessing login page while logged in
        if (req.path.includes('/login') && req.session.admin) {
            return res.redirect('/admin/dashboard');
        }

        // Check if not logged in
        if (!req.session.admin) {
            if (req.xhr) {
                return res.status(401).json({ redirectUrl: '/admin/login' });
            }
            return res.redirect('/admin/login');
        }

        // Verify admin exists and is not blocked
        const admin = await Admin.findById(req.session.admin.id);
        if (!admin || admin.isBlocked) {
            req.session.destroy((err) => {
                if (err) console.error('Session destruction error:', err);
            });
            if (req.xhr) {
                return res.status(401).json({ redirectUrl: '/admin/login' });
            }
            return res.redirect('/admin/login');
        }

        // Add admin to locals for views
        res.locals.admin = admin;
        next();
    } catch (error) {
        console.error('Admin Auth Middleware Error:', error);
        if (req.xhr) {
            return res.status(500).json({ redirectUrl: '/admin/login' });
        }
        res.redirect('/admin/login');
    }
};


module.exports = adminAuth;