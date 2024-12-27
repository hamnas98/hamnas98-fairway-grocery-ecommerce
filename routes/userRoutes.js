const express = require('express');
const router = express.Router();

const passport = require('passport');
const { getHome ,signup, resendOTP, verifySignupOTP, login , verifyLoginOTP,
        logout, forgotPasswordSubmit, verifyForgotPasswordOTP, resetPassword, googleCallback } = require('../controllers/user/userController');
const { getCategoryProducts } = require('../controllers/user/categoryController');
const { getProductDetails, getNewProducts, getBestvalueProducts } = require('../controllers/user/productController');
const { getDashboard, updateProfile, resetDashPassword } = require('../controllers/user/dashboardConroller');
const { getAllAddresses, addAddress, getAddress, updateAddress, deleteAddress, setDefaultAddress } = require('../controllers/user/addressController'); 
const { getCart, addToCart, updateCartQuantity, cartCount, removeFromCart, clearCart  } = require('../controllers/user/cartController');

const { userAuth }= require('../middleware/userAuth');



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
        failureRedirect: '/',
        failureFlash: true
    }),
    googleCallback
);


//user product & category routes
router.get('/category/:id', getCategoryProducts);
router.get('/product/:id', getProductDetails);
router.get('/products/new', getNewProducts)
router.get('/products/best-value-products', getBestvalueProducts)

//user dashbord 
router.get('/dashboard',userAuth, getDashboard);
router.post('/dashboard/update-profile',userAuth , updateProfile);
router.post('/dashboard/reset-password', userAuth, resetDashPassword);
//address routes
router.get('/dashboard/addresses', userAuth, getAllAddresses);
router.post('/dashboard/address', userAuth, addAddress);
router.get('/dashboard/address/:id', userAuth, getAddress);
router.put('/dashboard/address/:id', userAuth, updateAddress);
router.delete('/dashboard/address/:id', userAuth, deleteAddress);
router.put('/dashboard/address/:id/default', userAuth, setDefaultAddress);
// cart routes
router.get('/dashboard/cart', userAuth, getCart);
router.post('/cart/add', userAuth, addToCart);
router.put('/cart/update', userAuth, updateCartQuantity);
router.delete('/cart/remove/:productId', userAuth, removeFromCart);
router.delete('/cart/clear', userAuth, clearCart);
router.get('/cart/count', userAuth, cartCount);




module.exports = router;