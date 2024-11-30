const isAdmin = (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        // Check if it's an AJAX request
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.status(401).json({
                success: false,
                message: 'Please login to continue',
                redirectUrl: '/admin/login'
            });
        } else {
            res.redirect('/admin/login');
        }
    }
};

const isLoggedIn = (req, res, next) => {
    if (req.session.admin) {
        // Check if it's an AJAX request
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
};

module.exports = {
    isAdmin,
    isLoggedIn
};