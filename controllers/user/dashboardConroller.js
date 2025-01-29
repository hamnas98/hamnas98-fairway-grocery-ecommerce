const passport = require('passport');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const User = require('../../models/User');
const bcrypt = require('bcrypt');

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
            phone:user.phone,
            password:user.password
        };
        res.render('userDashboard', {
            parentCategories,
            pageTitle: 'Fairway Supermarket',
            user:req.session.user 
        });

  

    } catch (error) {
        console.error('DashBoard error:', error);
        res.status(500).render('error', { message: 'Failed to load DashBoard  page' });
    }
};


const updateProfile = async (req, res) => {
    try {
        const { name,  phone } = req.body;
        const userId = req.session.user.id;
        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

            if (phone !== user.phone) {
                const phoneExists = await User.findOne({ 
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

        user.phone = phone;

        await user.save();

        // Update session
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            phone:user.phone,
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

const resetDashPassword = async (req, res) => {
    try {
        const {newPassword, confirmPassword } = req.body;

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            return res.json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Find user
        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }
        const currentPassword = req.session.user.password
        // Verify current password
        const isMatch = await bcrypt.compare(newPassword, user.password);
        if (isMatch) {
            return res.json({
                success: false,
                message: 'Current password is not be same with previous One'
            });
        }


        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
};

module.exports = { getDashboard, updateProfile, resetDashPassword }