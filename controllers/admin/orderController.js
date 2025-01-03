const Order = require('../../models/Order');

const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        // Calculate stats
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(order => order.orderStatus === 'Pending').length;
        const deliveredOrders = orders.filter(order => order.orderStatus === 'Delivered').length;
        const cancelledOrders = orders.filter(order => order.orderStatus === 'Cancelled').length;

        res.render('adminOrders', {
            orders,
            totalOrders,
            pendingOrders,
            deliveredOrders,
            cancelledOrders,
            pageTitle: 'Order Management',
            path: '/admin/orders'
        });
    } catch (error) {
        console.error('Get orders error:', error);
        req.flash('error', 'Failed to load orders');
        res.redirect('/admin/dashboard');
    }
};

// Get single order details
const getOrderDetails = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('items.product')
            .populate('deliveryAddress');

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

// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Update status
        order.orderStatus = status;
        if (status === 'Delivered') {
            order.deliveredAt = new Date();
        }

        await order.save();

        res.json({
            success: true,
            message: 'Order status updated successfully'
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
};


module.exports = { getOrders, getOrderDetails, updateOrderStatus }