// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { getLoginPage, login, getDashboard , logout } = require('../controllers/adminController');
const { getAllCategories, getAddCategory, addCategory,getEditCategory,
     updateCategory,listingCategory, deleteCategory } = require('../controllers/categoryController');
const { categoryUpload,  } = require('../config/multer');
const { isAdmin, isLoggedIn,  } = require('../middleware/authMiddleware');

// Auth routes
router.get('/login', isLoggedIn, getLoginPage);
router.post('/login', isLoggedIn, login);
router.get('/logout', isAdmin, logout);

// Dashboard routes
router.get('/dashboard', isAdmin, getDashboard);

// Category routes
router.get('/categories', isAdmin, getAllCategories);
router.get('/categories/add', isAdmin, getAddCategory);
router.post('/categories/add', isAdmin, categoryUpload.single('image'), addCategory);

router.get('/categories/edit/:id', isAdmin, getEditCategory);
router.post('/categories/edit/:id', isAdmin, categoryUpload.single('image'), updateCategory);
router.put('/categories/listing/:id', isAdmin, listingCategory);
router.delete('/categories/delete/:id', isAdmin, deleteCategory);



module.exports = router;