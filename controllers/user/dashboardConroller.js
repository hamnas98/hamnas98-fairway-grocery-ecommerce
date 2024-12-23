const Category = require('../../models/Category');
const Product = require('../../models/Product');
const User = require('../../models/User');

const getDashboard = async (req, res) => {
    try {

        // Get all parent categories for the header
        const parentCategories = await Category.find({ 
          parent: null,
          isDeleted: false,
          listed: true 
      });

         const user = await User.findById(req.session.user.id)

         req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            phone:user.phone
        };
        res.render('userDashboard', {
            parentCategories,
            pageTitle: 'Fairway Supermarket',
            user:req.session.user 
        });

        console.log(req.session.user,'db')

    } catch (error) {
        console.error('DashBoard error:', error);
        res.status(500).render('error', { message: 'Failed to load DashBoard  page' });
    }
};


const updateProfile = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const userId = req.session.user.id;
        console.log(req.session.user.id,'userID ')
        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if email already exists
        if (email !== user.email) {
            const emailExists = await User.findOne({ 
                email, 
                _id: { $ne: userId } 
            });
            if (emailExists) {
                return res.json({
                    success: false,
                    message: 'Email already exists'
                });
            }
        }

            // Check if email already exists
            if (phone !== user.phone) {
                const emailExists = await User.findOne({ 
                    phone, 
                    _id: { $ne: userId } 
                });
                if (phoneExists) {
                    return res.json({
                        success: false,
                        message: 'Phone Number already exists'
                    });
                }
            }
    

        // Update user details
        user.name = name;
        user.email = email;
        user.phone = phone;

        await user.save();

        // Update session
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            phone:user.phone
        };

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};



module.exports = { getDashboard, updateProfile }