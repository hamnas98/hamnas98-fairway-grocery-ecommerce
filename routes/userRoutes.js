const express = require('express');
const router = express.Router();

const passport = require('passport');

const { userAuth }= require('../middleware/userAuth');


const { getHome ,signup, resendOTP, verifySignupOTP, login , verifyLoginOTP,
        logout, forgotPasswordSubmit, verifyForgotPasswordOTP, resetPassword, googleCallback } = require('../controllers/user/userController');
const { getCategoryProducts } = require('../controllers/user/categoryController');
const { getProductDetails, getNewProducts, getBestvalueProducts } = require('../controllers/user/productController');
const { getDashboard, updateProfile, resetDashPassword } = require('../controllers/user/dashboardConroller');
const { getAllAddresses, addAddress, getAddress, updateAddress, deleteAddress, setDefaultAddress } = require('../controllers/user/addressController'); 
const { getCart, addToCart, updateCartQuantity, cartCount, removeFromCart, clearCart, verifyCart  } = require('../controllers/user/cartController');
const { getCheckoutPage, placeOrder, applyCoupon} = require('../controllers/user/checkoutController');
const { getOrders, getOrderDetails, cancelOrder, processReturn, downloadInvoice } = require('../controllers/user/orderController');
const { quickSearch, getSearchPage, getSearchHistory, saveSearchHistory, deleteSearchHistory } = require("../controllers/user/searchController")
const { getWishlist, toggleWishlist, removeFromWishlist } = require("../controllers/user/wishlistController")
const { createRazorpayOrder, verifyPayment, cancelPayment, continuePayment, updatePaymentStatus, deletePendingOrder } = require("../controllers/user/razorpayController");
const { getWallet } = require('../controllers/user/walletController');
const { getReferralDetails, applyReferralCode } = require('../controllers/user/referralController');



//user routes
router.get('/', getHome);

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

//search routes
router.get('/quick-search', quickSearch);
router.get('/search-history',  getSearchHistory);
router.post('/search-history', userAuth,saveSearchHistory);
router.delete('/search-history/:itemId', userAuth, deleteSearchHistory);
router.get('/search', getSearchPage);
//user product & category routes
router.get('/category/:id', getCategoryProducts);
router.get('/product/:id', getProductDetails);
router.get('/products/new', getNewProducts)
router.get('/products/best-value-products', getBestvalueProducts)

//user dashbord 
router.get('/dashboard',userAuth, getDashboard);
router.post('/dashboard/update-profile',userAuth , updateProfile);
router.post('/dashboard/reset-password', userAuth, resetDashPassword);

//referral routes
router.get('/dashboard/referral', userAuth, getReferralDetails);
router.post('/dashboard/apply-referral-code', userAuth, applyReferralCode);

//address routes
router.get('/dashboard/addresses', userAuth, getAllAddresses);
router.post('/dashboard/address', userAuth, addAddress);
router.get('/dashboard/address/:id', userAuth, getAddress);
router.put('/dashboard/address/:id', userAuth, updateAddress);
router.delete('/dashboard/address/:id', userAuth, deleteAddress);
router.put('/dashboard/address/:id/default', userAuth, setDefaultAddress);
// cart routes
router.get('/dashboard/cart', userAuth, getCart);
router.post('/cart/add', addToCart);
router.put('/cart/update', updateCartQuantity);
router.delete('/cart/remove/:productId', removeFromCart);
router.delete('/cart/clear', userAuth, clearCart);
router.get('/cart/count', userAuth, cartCount);
router.get('/cart/verify', userAuth, verifyCart);


//wishlist routes

router.get('/dashboard/wishlist', userAuth, getWishlist)
router.post('/wishlist/toggle', userAuth, toggleWishlist);
router.delete('/wishlist/remove/:productId', userAuth, removeFromWishlist);


//checkout routeas
router.get('/checkout', userAuth, getCheckoutPage);
router.post('/place-order', userAuth, placeOrder);
router.post('/cancel-payment', userAuth, cancelPayment);
router.post('/apply-coupon', userAuth, applyCoupon);

//razorPay Routes
router.post('/create-razorpay-order', userAuth, createRazorpayOrder);
router.post('/verify-payment', userAuth, verifyPayment);
router.post('/update-payment-status', userAuth , updatePaymentStatus);
router.post('/continue-payment', userAuth , continuePayment);
router.post('/delete-pending-order', userAuth , deletePendingOrder);

//order routes
router.get('/dashboard/orders', userAuth, getOrders);
router.get('/orders/:id', userAuth, getOrderDetails);
router.post('/orders/cancel', userAuth, cancelOrder);
router.post('/orders/return', userAuth, processReturn);
router.get('/orders/invoice/:orderId', userAuth, downloadInvoice);

//wallet routes
router.get('/dashboard/wallet', userAuth, getWallet);


module.exports = router;