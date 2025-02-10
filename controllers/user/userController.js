const User = require('../../models/User');
const { generateOTP , sendOTP } = require('../../utils/otpUtils');
const bcrypt = require('bcryptjs');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const ReferralService = require('../../utils/referralService');


const getHome = async (req, res) => {
    try {

        const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        }).select('name image');

        
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
            discountPercentage: { $gt: 0 }  
        })
        .sort({ discountPercentage: -1 })  
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
            pageTitle: 'Fairway Supermarket',
            
        });

    } catch (error) {
        console.error('Homepage error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};

const signup = async (req, res) => {
    try {
        const { name, email, phone, password, referralCode } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email or phone already registered' });
        }

        const otp = generateOTP();
        req.session.userData = {
            otp,
            phone,
            email,
            name,
            password,
            expiresAt: Date.now() + 10 * 60 * 1000,
            referralCode 
        };

        await sendOTP(email, otp);
        return res.status(200).json({ success: true, message: 'OTP sent successfully' });     

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const resendOTP = async (req, res) => {
    try {
        const otp = generateOTP();
        const {type,email} = req.body;


        if (type === 'signup' && req.session.userData) {
            req.session.userData.otp = otp;
            req.session.userData.expiresAt = Date.now() + 10 * 60 * 1000;
        } else if (type === 'login' && req.session.userData) {
            req.session.userData.otp = otp;
            req.session.userData.expiresAt = Date.now() + 10 * 60 * 1000;
        } else if (type === 'forgot' && req.session.userData) {
            req.session.userData.otp = otp;
            req.session.userData.expiresAt = Date.now() + 10 * 60 * 1000;
        }else {
            return res.json({
                success: false,
                message: 'Invalid request'
            });
        }

        const emailSent = await sendOTP(email,otp);
 


        res.status(200).json({
            success: true,
            message: 'OTP resent successfully'
        });
    } catch (error) {
        console.error(error);
        res.json({
            success: false,
            message: 'Error resending OTP'
        });
    }
};

const verifySignupOTP = async (req, res) => {
    try {
        const { otp } = req.body;
    

        if (!req.session.userData || req.session.userData.expiresAt < Date.now()) {
            return res.json({
                success: false,
                message: 'OTP expired. Please try again.'
            });
        }

        if (otp !== req.session.userData.otp) {
            return res.json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // Create new user
        const user = new User({
            name: req.session.userData.name,
            email: req.session.userData.email,
            phone: req.session.userData.phone,
            password: req.session.userData.password,
            isVerified: true
        });
        // Process referral if code provided
        if (req.session.userData.referralCode) {
             await ReferralService.processReferral(req.session.userData.referralCode, user._id);
        }
            
        // Generate referral code for new user
        await ReferralService.generateReferralCode(user._id);

        await user.save();

  

        
        delete req.session.userData;


        res.json({
            success: true,
            message: 'Account created successfully, Please Login',
            redirectUrl: '/'
        });
    } catch (error) {
        console.error(error);
        res.json({
            success: false,
            message: 'Error in verification'
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // console.log(email,password)

        const user = await User.findOne({ email });

        if (!user) {
            return res.json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        if(!user.password){
            return res.json({
                success: false,
                message: 'Please Login with Google'
            });
        }


        if (user.isBlocked) {
            return res.status(409).json({
                success: false,
                message: 'Account is blocked'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate login OTP and store in session
        const otp = generateOTP();
        req.session.userData = {
            otp: otp,
            userId: user._id,
            expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
        };

        const emailSent = await sendOTP(email,otp);
        // console.log(req.session.userData)


        return res.status(200).json({
            success: true,
            message: 'OTP sent successfully'
        });
    } catch (error) {
        console.error(error);
       return res.status(500).json({
            success: false,
            message: 'Error in login'
        });
    }
};

const verifyLoginOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        const userData = req.session.userData;

        if (!userData || userData.expiresAt < Date.now()) {
            return res.json({
                success: false,
                message: 'OTP expired. Please try again.'
            });
        }

        if (otp !== userData.otp) {
            return res.json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // Get user and set session
        const user = await User.findById(userData.userId);
        req.session.user = {
            id: user._id,
            name: user.name
        };

        // Clear login OTP from session
        delete req.session.userData.otp;

        res.status(200).json({
            success: true,
            message: 'Login successful',
            redirectUrl: '/'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error in verification'
        });
    }
};

const logout = (req, res) => {
    req.session.destroy(err => {
        if (err) console.error('Logout error:', err);
        res.redirect('/');
    });
};

const forgotPasswordSubmit = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        // console.log(user ,'fp')

        if (!user ) {
            return res.json({ 
                success: false, 
                message: 'No account found with this email' 
            });
        }
        if (!user.password ) {
            return res.json({ 
                success: false, 
                message: 'please Login with Google' 
            });
        }

        // Generate OTP
        const otp = generateOTP();
        
        // Save OTP in session
        req.session.userData = {
            email,
            otp,
            expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
        };

        // Send OTP to email
        await sendOTP(email, otp);

        res.status(200).json({ 
            success: true, 
            message: 'OTP sent to your email' 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to process request' });
    }
};
const verifyForgotPasswordOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        const storedData = req.session.userData;
        // console.log(otp,storedData)

        if (!storedData.otp || storedData.otp.expiresAt < Date.now()) {
            return res.json({ 
                success: false, 
                message: 'OTP expired. Please request again.' 
            });
        }

        if (otp !== storedData.otp) {
            return res.json({ 
                success: false, 
                message: 'Invalid OTP' 
            });
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error verifying OTP' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const { email } = req.session.userData;
    

        const user = await User.findOne({ email });
        user.password = password;
        await user.save();

        // Clear session
        delete req.session.userData;

        res.status(200).json({ 
            success: true, 
            message: 'Password reset successfully',
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
};

const googleCallback = async (req, res) => {
    try {
     
        const user = await User.findById(req.user._id);
        // console.log(user)
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }

        if (user.isBlocked) {
            req.flash('error', 'Your account has been blocked. Please contact support');
            return res.redirect('/');
        }

        if (user.isDeleted) {
            req.flash('error', 'Account not found. Please create a new account');
            return res.redirect('/');
        }

        //set session for user
        req.session.user = {
            id: user._id,
            name: user.name
        };



 
        res.redirect('/');
        
    } catch (error) {
        console.error('Google auth callback error:', error);
        req.flash('error', 'Authentication failed');
        res.redirect('/');
    }
};




module.exports = { getHome ,signup, resendOTP , verifySignupOTP, login ,
                   verifyLoginOTP, logout, forgotPasswordSubmit, verifyForgotPasswordOTP, resetPassword, googleCallback };