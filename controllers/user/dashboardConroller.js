const passport = require('passport');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const User = require('../../models/User');
const Order = require('../../models/Order');
const Wallet = require('../../models/Wallet');
const Wishlist = require('../../models/Wishlist');
const bcrypt = require('bcrypt');

const getDashboard = async (req, res) => {
    try {
        // Get all parent categories for the header
        const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        });

        // Get user details
        const user = await User.findById(req.session.user.id);

        // Get order statistics with null checks
        const orders = await Order.find({ user: req.session.user.id }) || [];
        const pendingOrders = await Order.find({ 
            user: req.session.user.id,
            orderStatus: { $in: ['Pending', 'Processing', 'Payment Pending'] }
        }) || [];

        // Get wishlist count
        const wishlistItems = await Wishlist.findOne({ user: req.session.user.id });
        const wishlistCount = wishlistItems ? wishlistItems.items.length : 0;

        // Get wallet balance
        const wallet = await Wallet.findOne({ user: req.session.user.id });
        const walletBalance = wallet ? wallet.balance : 0;

        // Get recent activities (last 5)
        const recentOrders = await Order.find({ user: req.session.user.id })
            .sort({ createdAt: -1 })
            .limit(5);

        // Format recent activities
        const recentActivities = recentOrders.map(order => ({
            icon: getActivityIcon(order.orderStatus),
            description: getActivityDescription(order),
            time: formatActivityTime(order.createdAt)
        }));

        // Update session
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            password: user.password
        };

        // Render dashboard with all data
        res.render('userDashboard', {
            parentCategories,
            pageTitle: 'Fairway Supermarket - Dashboard',
            user: req.session.user,
            stats: {
                totalOrders: orders ? orders.length : 0,
                pendingOrders: pendingOrders ? pendingOrders.length : 0,
                walletBalance,
                wishlistItems: wishlistCount
            },
            recentActivities
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', { message: 'Failed to load Dashboard page' });
    }
};
const getActivityIcon = (orderStatus) => {
    switch (orderStatus) {
        case 'Delivered':
            return 'uil-package-check';
        case 'Shipped':
            return 'uil-truck';
        case 'Processing':
            return 'uil-process';
        case 'Pending':
            return 'uil-clock';
        case 'Payment Pending':
            return 'uil-wallet';
        case 'Cancelled':
            return 'uil-times-circle';
        default:
            return 'uil-box';
    }
};

const getActivityDescription = (order) => {
    const orderIdShort = order._id.toString().slice(-6);
    switch (order.orderStatus) {
        case 'Delivered':
            return `Order #${orderIdShort} was delivered successfully`;
        case 'Shipped':
            return `Order #${orderIdShort} has been shipped`;
        case 'Processing':
            return `Order #${orderIdShort} is being processed`;
        case 'Pending':
            return `New order #${orderIdShort} placed`;
        case 'Payment Pending':
            return `Payment pending for order #${orderIdShort}`;
        case 'Cancelled':
            return `Order #${orderIdShort} was cancelled`;
        default:
            return `Order #${orderIdShort} status updated to ${order.orderStatus}`;
    }
};

const formatActivityTime = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInHours = Math.floor((now - activityTime) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
        if (diffInHours === 0) {
            const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));
            return `${diffInMinutes} minutes ago`;
        }
        return `${diffInHours} hours ago`;
    } else if (diffInHours < 48) {
        return 'Yesterday';
    } else {
        return activityTime.toLocaleDateString('en-US', { 
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
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