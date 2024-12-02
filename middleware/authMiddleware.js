const authMiddleware = {
    isAdmin: (req, res, next) => {
        if (req.session.admin) {
            // Store admin in locals for views
            res.locals.admin = req.session.admin;
            next();
        } else {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                res.status(401).json({
                    success: false,
                    message: 'Please login to continue',
                    redirectUrl: '/admin/login'
                });
            } else {
                req.flash('error', 'Please login to continue');
                res.redirect('/admin/login');
            }
        }
    },

    isLoggedIn: (req, res, next) => {
        if (req.session.admin) {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                res.json({
                    success: false,
                    message: 'Already logged in',
                    redirectUrl: '/admin/dashboard'
                });
            } else {
                res.redirect('/admin/dashboard');
            }
        } else {
            next();
        }
    }
};


module.exports = authMiddleware;