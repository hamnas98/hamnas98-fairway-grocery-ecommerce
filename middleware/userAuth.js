const User = require('../models/User')



const userAuth = async (req, res, next) => {
    try {
          // Add no-cache headers
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        if (!req.session.user || !req.session.user.id) {
            if (req.xhr) {
                return res.status(401).json({
                    success: false,
                    message: 'Please login to continue'
                });
            }
            req.flash('error', 'Please login to continue');
            return res.redirect('/');
        }
    
        const user = await User.findById(req.session.user.id);

        if (!user) {
            if (req.xhr) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            req.flash('error', 'User not found. Please login again');
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
                res.redirect('/');
            });
            return;
        }

        if (user.isBlocked) {
            req.flash('error', 'Your account has been blocked. Please contact support');
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
                res.redirect('/');
            });
            return;
        }

        if (user.isDeleted) {
            req.flash('error', 'Account not found. Please create a new account');
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
                res.redirect('/');
            });
            return;
        }

        if (!user.isVerified) {
            req.flash('info', 'Please verify your email to continue');
            return res.redirect('/verify-email');
        }

        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        req.flash('error', 'Something went wrong. Please try again');
        res.redirect('/');
    }
};

 module.exports ={ userAuth };