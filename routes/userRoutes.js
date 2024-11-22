const express = require('express');
const router = express.Router();
const passport = require('passport')
const validateSignup = require('../middlewares/validateSignup');

const {  page404, signupPage, forgotPasswordPage } = require('../controllers/user/pageController');
const { userSignup , VerifyOTP , resendOTP , loginPage ,userLogin , homePage , userLogout,sendResetOTP,verifyResetOTP,updatePassword} = require('../controllers/user/userController');

// Route to render the home page
router.get('/', homePage);

// Route to render the Signup page
router.get('/signup', signupPage);

// Signup route with validation middleware
router.post('/signup', validateSignup, userSignup);

router.post('/otp-verification', VerifyOTP);

router.post('/resend-otp', resendOTP);

router.get('/login', loginPage);

router.post('/login', userLogin);

router.get('/logout', userLogout);

router.get('/forgot-password', forgotPasswordPage);

router.post('/forgot-password', sendResetOTP);

router.post('/verify-reset-otp', verifyResetOTP);

// Route to render the Update Password page
router.get('/update-password', (req, res) => {
    // Ensure the session contains a valid reset email
    if (!req.session.resetEmail) {
        return res.status(403).send("Unauthorized access. Please try again.");
    }

    // Render the Update Password page with the reset email
    res.render('update-password', { message:null,email: req.session.resetEmail });
});


router.post('/update-password', updatePassword);





// Route to start Google Sign-In
router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google callback route
router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/signup' }),
    (req, res) => {
        // Successful authentication
        res.redirect('/');
    }
);

// Route to log out
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error(err);
            return res.redirect('/');
        }
        res.redirect('/signup');
    });
});

// Fallback route
router.get('/pageNotFound', page404);

module.exports = router;

