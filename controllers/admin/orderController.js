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

        res.render('orders', {
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

module.exports = { getOrders }