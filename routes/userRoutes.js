const express = require('express');
const router = express.Router();
const validateSignup = require('../middlewares/validateSignup');

const { homePage, page404, signupPage,  } = require('../controllers/user/pageController');
const { userSignup , VerifyOTP , resendOTP } = require('../controllers/user/userController');

// Route to render the home page
router.get('/', homePage);

// Route to render the Signup page
router.get('/signup', signupPage);

// Signup route with validation middleware
router.post('/signup', validateSignup, userSignup);

router.post('/otp-verification', VerifyOTP);

router.post('/resend-otp', resendOTP)

// Fallback route
router.get('/pageNotFound', page404);

module.exports = router;

