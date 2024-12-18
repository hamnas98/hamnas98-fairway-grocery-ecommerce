const User = require('../models/User')

const checkUserStatus = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            return next();
        }

        const user = await User.findById(req.session.userId);
        
        if (!user || user.isDeleted || user.isBlocked) {
            // Clear user session
            req.session.destroy((err) => {
                if (err) console.error('Session destruction error:', err);
            });
            res.clearCookie('connect.sid');
            
            // Redirect with appropriate message
            const message = user?.isBlocked ? 'Your account has been blocked' : 'Your account no longer exists';
            return res.redirect(`/login?error=${encodeURIComponent(message)}`);
        }

        next();
    } catch (error) {
        console.error('User status check error:', error);
        next(error);
    }
};

const userAuth = async (req, res, next) => {
    try {
        // Add no-cache headers
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        if (!req.session.user) {
            req.flash('error', 'Please login to continue');
            return res.redirect('/login');
        }

        const user = await User.findById(req.session.user.id);

        if (!user) {
            req.flash('error', 'User not found. Please login again');
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
                res.redirect('/login');
            });
            return;
        }

        if (user.isBlocked) {
            req.flash('error', 'Your account has been blocked. Please contact support');
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
                res.redirect('/login');
            });
            return;
        }

        if (user.isDeleted) {
            req.flash('error', 'Account not found. Please create a new account');
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
                res.redirect('/signup');
            });
            return;
        }

        if (!user.isVerified) {
            req.flash('info', 'Please verify your email to continue');
            return res.redirect('/verify-email');
        }

        // Prevent accessing auth pages after login
        if (req.path.match(/\/(login|signup|forgot-password)/)) {
            return res.redirect('/');
        }

        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        req.flash('error', 'Something went wrong. Please try again');
        res.redirect('/login');
    }
};

 module.exports ={ userAuth, checkUserStatus };