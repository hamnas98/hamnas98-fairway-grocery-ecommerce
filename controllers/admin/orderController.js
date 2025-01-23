const Order = require('../../models/Order');

const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

            orders.forEach(order => {
                const cancelledItems = order.items.filter(item => item.cancelled).length;
                if (cancelledItems > 0 && cancelledItems < order.items.length) {
                    order.partialCancellation = true;
                    order.cancelledItemsCount = cancelledItems;
                }
            });

        // Calculate stats
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(order => order.orderStatus === 'Pending').length;
        const deliveredOrders = orders.filter(order => order.orderStatus === 'Delivered').length;
        const cancelledOrders = orders.filter(order => 
            order.orderStatus === 'Cancelled' || order.partialCancellation
        ).length;

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


const updateOrderStatus = async (req, res) => {
    try {
        const { status, cancelReason } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check if order has active return request or is in return process
        const returnStatuses = ['Return Pending', 'Return Processing', 'Return Completed', 'Return Rejected', 'Partially Returned'];
        if (order.returnDetails?.isReturned || returnStatuses.includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot update status: Order has active return request'
            });
        }

        // Prevent delivered orders from being updated unless returning to previous status
        if (order.orderStatus === 'Delivered' && !['Shipped', 'Processing'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot update status of delivered order'
            });
        }

        order.orderStatus = status;

        if (status === 'Cancelled') {
            order.cancelReason = cancelReason;
            order.cancelledAt = new Date();
        } else if (status === 'Processing') {
            order.processingAt = new Date();
        } else if (status === 'Shipped') {
            order.shippedAt = new Date();
        } else if (status === 'Delivered') {
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