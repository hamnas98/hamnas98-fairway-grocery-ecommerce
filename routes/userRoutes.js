const express = require('express');
const router = express.Router();
const { getHome, getSignup } = require('../controllers/user/userController');
const { getCategoryProducts } = require('../controllers/user/categoryController');
const { getProductDetails } = require('../controllers/user/productController');


//user routes
router.get('/', getHome);

router.get('/signup', getSignup);


//user product category routes
router.get('/category/:id', getCategoryProducts);
router.get('/product/:id', getProductDetails);



module.exports = router;