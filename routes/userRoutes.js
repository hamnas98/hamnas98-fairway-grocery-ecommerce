const express = require('express');
const router = express.Router();
const { getHome ,signup, resendOTP, verifySignupOTP } = require('../controllers/user/userController');
const { getCategoryProducts } = require('../controllers/user/categoryController');
const { getProductDetails } = require('../controllers/user/productController');


//user routes
router.get('/', getHome);

// router.get('/signup', getSignup);
router.post('/signup', signup);
router.post('/resend-otp', resendOTP);
router.post('/verify-signup-otp',verifySignupOTP);


//user product category routes
router.get('/category/:id', getCategoryProducts);
router.get('/product/:id', getProductDetails);



module.exports = router;