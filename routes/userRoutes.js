const express = require('express');
const router = express.Router();
const { getHome, getSignup } = require('../controllers/user/userController');
const { getCategoryProducts } = require('../controllers/user/categoryController');



router.get('/', getHome);

router.get('/signup', getSignup);

router.get('/category/:id', getCategoryProducts);

module.exports = router;