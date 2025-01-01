const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Category = require('../../models/Category');

// Get all orders
const getOrders = async (req, res) => {

    try {

              // Get all parent categories for the header
              const parentCategories = await Category.find({ 
                parent: null,
                isDeleted: false,
                listed: true 
            });

        const orders = await Order.find({ user: req.session.user.id })
            .populate('items.product')
            .populate('deliveryAddress')
            .sort({ createdAt: -1 });

        res.render('orders', {
            parentCategories,
            orders,
            user:req.session.user,
            pageTitle: 'My Orders'
        });
    } catch (error) {
        console.error('Get orders error:', error);
        req.flash('error', 'Failed to load orders');
        res.redirect('/');
    }
};

// Get single order details
const getOrderDetails = async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.session.user.id
        })
        .populate('items.product')
        .populate('deliveryAddress');
        console.log(req.params.id)
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Get order details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load order details'
        });
    }
};

module.exports = { getOrders, getOrderDetails }