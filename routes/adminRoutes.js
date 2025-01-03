
const express = require('express');
const router = express.Router();
const { getLoginPage, login, getDashboard , logout } = require('../controllers/admin/adminController');
const { getAllCategories, getAddCategory, addCategory,getEditCategory,
        updateCategory,listingCategory, deleteCategory } = require('../controllers/admin/categoryController');
const { categoryUpload, productUpload } = require('../config/multer');
const adminAuth = require('../middleware/amninAuth');
const { getAllProducts, getAddProduct, getParentCategory, addProduct, getEditProduct, 
        updateProduct, listingProduct, deleteProduct, getProductDetails  } = require('../controllers/admin/productController');
const { getUsers, toggleUserBlock, deleteUser } = require('../controllers/admin/userController');
const { getOrders, getOrderDetails, updateOrderStatus } = require('../controllers/admin/orderController');


// router.use(adminAuth);
// admin routes
router.get('/login', getLoginPage);
router.post('/login', login);
router.post('/logout', adminAuth, logout);
router.get('/dashboard', getDashboard);

// Category routes
router.get('/categories', adminAuth, getAllCategories);
router.get('/categories/add', adminAuth, getAddCategory);
router.post('/categories/add', adminAuth, categoryUpload, addCategory);
router.get('/categories/edit/:id', adminAuth, getEditCategory);
router.post('/categories/edit/:id', adminAuth, categoryUpload, updateCategory);
router.put('/categories/listing/:id', adminAuth, listingCategory);
router.delete('/categories/delete/:id', adminAuth, deleteCategory);

// product routes
router.get('/products', adminAuth, getAllProducts);
router.get('/products/add', adminAuth, getAddProduct);
router.get('/categories/:parentId/subcategories', adminAuth, getParentCategory);
router.post('/products/add', adminAuth, productUpload, addProduct);
router.get('/products/edit/:id', adminAuth, getEditProduct);
router.post('/products/edit/:id', adminAuth, productUpload, updateProduct);
router.put('/products/listing/:id', adminAuth, listingProduct);
router.delete('/products/delete/:id', adminAuth, deleteProduct);
router.get('/products/view/:id', adminAuth, getProductDetails);

// user routes
router.get('/users', adminAuth, getUsers);
router.put('/users/isBlocked/:id', adminAuth, toggleUserBlock);
router.delete('/users/delete/:id', adminAuth, deleteUser);

//order routes
router.get('/orders', adminAuth, getOrders);
router.get('/orders/:id', adminAuth, getOrderDetails);
router.put('/orders/update-status/:id', adminAuth, updateOrderStatus);

module.exports = router;