const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
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

        // Add partial cancellation status
        orders.forEach(order => {
            const cancelledItems = order.items.filter(item => item.cancelled).length;
            if (cancelledItems > 0 && cancelledItems < order.items.length) {
                order.orderStatus = 'Partially Cancelled';
            }
        });

        
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

const cancelOrder = async (req, res) => {
    try {
        const { orderId, cancelType, items, reason } = req.body;

        const order = await Order.findOne({
            _id: orderId,
            user: req.session.user.id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (!['Pending', 'Processing'].includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled at this stage'
            });
        }

        if (cancelType === 'full') {
            order.orderStatus = 'Cancelled';
            order.cancelReason = reason;
            order.cancelledAt = new Date();
        } else {
            // Handle partial cancellation
            order.items = order.items.map(item => {
                if (items.includes(item._id.toString())) {
                    item.cancelled = true;
                    item.cancelledAt = new Date();
                    item.cancelReason = reason;
                }
                return item;
            });

            // If all items are cancelled, cancel the entire order
            if (order.items.every(item => item.cancelled)) {
                order.orderStatus = 'Cancelled';
                order.cancelReason = reason;
                order.cancelledAt = new Date();
            }

            // Recalculate order total
            order.total = order.items.reduce((sum, item) => {
                if (!item.cancelled) {
                    return sum + (item.price * item.quantity);
                }
                return sum;
            }, 0);

            order.discountTotal = order.items.reduce((sum, item) => {
                if (!item.cancelled) {
                    return sum + ((item.discountPrice || item.price) * item.quantity);
                }
                return sum;
            }, 0);
        }
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.product._id,
                { $inc: { stock: item.quantity } }  // Increment stock by cancelled quantity
            );
        }
        

        await order.save();

        res.json({
            success: true,
            message: cancelType === 'full' ? 'Order cancelled successfully' : 'Selected items cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order'
        });
    }
};




module.exports = { getOrders, getOrderDetails, cancelOrder, cancelOrder }