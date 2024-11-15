const express = require('express');
const router = express.Router();

// Controller function to render the home page
const { homePage, page404 } = require('../controllers/userController');

// Route to render the home page
router.get('/', homePage);

router.get('/pageNotFound', page404);

module.exports = router;
