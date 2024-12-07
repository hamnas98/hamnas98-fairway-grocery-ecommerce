

const userAuth = async (req, res, next) => {
    try {
        if (!req.session.user) {
            req.flash('error', 'Please login to continue');
            return res.redirect('/login');
        }
 
        const user = await User.findById(req.session.user.id);
 
        if (!user) {
            req.flash('error', 'User not found. Please login again');
            req.session.destroy();
            return res.redirect('/login');
        }
 
        if (user.isBlocked) {
            req.flash('error', 'Your account has been blocked. Please contact support');
            req.session.destroy(); 
            return res.redirect('/login');
        }
 
        if (user.isDeleted) {
            req.flash('error', 'Account not found. Please create a new account');
            req.session.destroy();
            return res.redirect('/signup');
        }
 
        if (!user.isVerified) {
            req.flash('info', 'Please verify your email to continue');
            return res.redirect('/verify-email');
        }
 
        next();
    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong. Please try again');
        res.redirect('/login');
    }
 };

 module.exports = userAuth