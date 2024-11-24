const express = require('express');
const router = express.Router();

const adminAuth = require('../middlewares/adminAuth'); // Your admin authentication middleware

const {upload,processCategoryImage} = require('../middlewares/uploads')
const { adminSignIn , loadLogin, loadDashboard , logout , userList, blockUser , 
    unblockUSer, getCategories,  addCategory, loadAddCategory,
editCategory ,updateCategory, deleteCategory} = require('../controllers/admin/adminController'); // Admin SignIn controller

const User = require('../models/User');


//admin Routes

router.get('/login',loadLogin);

router.post('/login', adminSignIn);

router.get('/logout', logout);


router.get('/dashboard', adminAuth, loadDashboard);

//admin user management
router.get('/users',adminAuth,userList);

// Block a user
router.post('/users/block/:id', blockUser) ;

// Unblock a user
router.post('/users/unblock/:id', unblockUSer);

//admin category routes

router.get('/categories', getCategories);  //list category

router.get('/category/add', loadAddCategory);

// Add Category
router.post('/category/add', upload.single('image'), processCategoryImage, addCategory);

router.get('/category/edit/:id',editCategory);

router.post('/category/edit/:id', upload.single('image'),editCategory);

router.post('/category/delete/:id', deleteCategory);

router.post('/category/update/:id', upload.single('image'), processCategoryImage, updateCategory);






// Other admin routes...

module.exports = router;
