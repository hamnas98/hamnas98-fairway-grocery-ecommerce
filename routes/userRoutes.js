const express = require('express');
const router = express.Router();

const passport = require('passport');
const { getHome ,signup, resendOTP, verifySignupOTP, login , verifyLoginOTP,
        logout, forgotPasswordSubmit, verifyForgotPasswordOTP, resetPassword } = require('../controllers/user/userController');
const { getCategoryProducts } = require('../controllers/user/categoryController');
const { getProductDetails, getNewProducts, getBestvalueProducts } = require('../controllers/user/productController');
const { getDashboard } = require('../controllers/user/dashboardConroller');
const userAuth = require('../middleware/userAuth');


//user routes
router.get('/', getHome);

// router.get('/signup', getSignup);
router.post('/signup', signup);
router.post('/resend-otp', resendOTP);
router.post('/verify-signup-otp',verifySignupOTP);
router.post('/login', login);
router.post('/verify-login-otp', verifyLoginOTP);
router.get('/logout', logout);
router.post('/forgot-password', forgotPasswordSubmit);
router.post('/verify-forgot-password-otp', verifyForgotPasswordOTP);
router.post('/reset-password', resetPassword);

//google authentication

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    passport.authenticate('google', { 
        failureRedirect: '/login',
        failureFlash: true
    }),
    (req, res) => {

        req.session.user = {
            id: req.user._id,
            name: req.user.name
        }
        // Successful authentication
        res.redirect('/');
    }
);

//user product & category routes
router.get('/category/:id', getCategoryProducts);
router.get('/product/:id', getProductDetails);
router.get('/products/new', getNewProducts)
router.get('/products/best-value-products', getBestvalueProducts)

//user dashbord 

router.get('/dashboard',userAuth, getDashboard)






module.exports = router;