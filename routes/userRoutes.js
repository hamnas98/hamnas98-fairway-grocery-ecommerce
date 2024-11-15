const express = require('express');
const router = express.Router();

// Controller function to render the home page
const { homePage } = require('../controllers/userController');

// Route to render the home page
router.get('/', homePage);

module.exports = router;
