
const express = require('express');
const router = express.Router();
const { getLoginPage, login, getDashboard , logout } = require('../controllers/admin/adminController');
const { getAllCategories, getAddCategory, addCategory,getEditCategory,
        updateCategory,listingCategory, deleteCategory } = require('../controllers/admin/categoryController');
const { categoryUpload, productUpload } = require('../config/multer');
const { isAdmin, isLoggedIn,  } = require('../middleware/authMiddleware');
const { getAllProducts, getAddProduct, getParentCategory, addProduct, getEditProduct, 
        updateProduct, listingProduct, deleteProduct, getProductDetails  } = require('../controllers/admin/productController')

// admin routes
router.get('/login', isLoggedIn, getLoginPage);
router.post('/login', isLoggedIn, login);
router.get('/logout', isAdmin, logout);
router.get('/dashboard', isAdmin, getDashboard);

// Category routes
router.get('/categories', isAdmin, getAllCategories);
router.get('/categories/add', isAdmin, getAddCategory);
router.post('/categories/add', isAdmin, categoryUpload, addCategory);
router.get('/categories/edit/:id', isAdmin, getEditCategory);
router.post('/categories/edit/:id', isAdmin, categoryUpload, updateCategory);
router.put('/categories/listing/:id', isAdmin, listingCategory);
router.delete('/categories/delete/:id', isAdmin, deleteCategory);

// product routes
router.get('/products', isAdmin, getAllProducts);
router.get('/products/add', isAdmin, getAddProduct);
router.get('/categories/:parentId/subcategories', isAdmin, getParentCategory);
router.post('/products/add', isAdmin, productUpload, addProduct);
router.get('/products/edit/:id', isAdmin, getEditProduct);
router.post('/products/edit/:id', isAdmin, productUpload, updateProduct);
router.put('/products/listing/:id', isAdmin, listingProduct);
router.delete('/products/delete/:id', isAdmin, deleteProduct);
router.get('/products/view/:id', isAdmin, getProductDetails);



module.exports = router;