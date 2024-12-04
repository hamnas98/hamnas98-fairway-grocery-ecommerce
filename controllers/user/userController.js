const User = require('../../models/User');
const { generateOTP } = require('../../utils/otpUtils');
const bcrypt = require('bcryptjs');
const Category = require('../../models/Category');
const Product = require('../../models/Product');


const getHome = async (req, res) => {
    try {
        // Get parent categories
        const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        }).select('name image');

        // Find the Fruits & Vegetables parent category
        const fruitsVegCategory = await Category.findOne({ 
            name: "Fruits & Vegetables",
            parent: null,
            isDeleted: false 
        });

        let fruitsVegProducts = [];
        if (fruitsVegCategory) {
            // Find all subcategories of Fruits & Vegetables
            const subcategories = await Category.find({ 
                parent: fruitsVegCategory._id,
                isDeleted: false 
            });

            // Get all subcategory IDs including the parent category ID
            const categoryIds = [fruitsVegCategory._id, ...subcategories.map(sub => sub._id)];

            // Find products that belong to either the parent category or its subcategories
            fruitsVegProducts = await Product.find({
                category: { $in: categoryIds },
                isDeleted: false,
                listed: true
            })
            .populate('category') 
            .limit(10);
        }

          // Get products with highest discounts
          const bestvalueProducts = await Product.find({
            isDeleted: false,
            listed: true,
            discountPercentage: { $gt: 0 }  // Only get products with discount
        })
        .sort({ discountPercentage: -1 })  // Sort by highest discount first
        .limit(10);

        // Get new products
        const newProducts = await Product.find({
            isDeleted: false,
            listed: true
        })
        .sort({ createdAt: -1 })
        .limit(10);

        res.render('home', {
            parentCategories,
            fruitsVegProducts,
            bestvalueProducts,
            newProducts,
            user: req.session.user || null,
            pageTitle: 'Fairway Supermarket'
        });

    } catch (error) {
        console.error('Homepage error:', error);
        res.render('home', {
            parentCategories: [],
            fruitsVegProducts: [],
            featuredProducts: [],
            newProducts: [],
            user: req.session.user || null,
            pageTitle: 'Fairway Supermarket'
        });
    }
};

const getSignup = (req, res) => {
    try {
        res.render('signup');
    } catch (error) {
        console.error('Login page error:', error);
        res.status(500).send('Server error');
    }
   
};

const signup = async (req, res) => {
    try {
        const { name, email, mobile, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({
            $or: [{ email }, { mobile }]
        });

        if (existingUser) {
            return res.json({
                success: false,
                message: 'Email or mobile already registered'
            });
        }

        // Generate OTP and store in session
        const otp = generateOTP();
        req.session.signupOTP = {
            code: otp,
            mobile,
            email,
            name,
            password,
            expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
        };

        // Send OTP (implement your SMS/email service)
        console.log('Signup OTP:', otp);

        res.json({
            success: true,
            message: 'OTP sent successfully'
        });
    } catch (error) {
        console.error(error);
        res.json({
            success: false,
            message: 'Error in signup'
        });
    }
};


module.exports = { getHome, getSignup ,signup };