const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const Wallet = require('../../models/Wallet');
const {refundToWallet} = require('../../controllers/user/walletController')
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

        let refundAmount = 0;

        if (cancelType === 'full') {
            order.orderStatus = 'Cancelled';
            order.cancelReason = reason;
            order.cancelledAt = new Date();
            refundAmount = order.discountTotal;

            // Return stock for all items
            for (const item of order.items) {
                await Product.findByIdAndUpdate(
                    item.product._id,
                    { $inc: { stock: item.quantity } }
                );
            }
        } else {
            // Handle partial cancellation
            order.items = order.items.map(item => {
                if (items.includes(item._id.toString())) {
                    item.cancelled = true;
                    item.cancelledAt = new Date();
                    item.cancelReason = reason;
                    refundAmount += (item.discountPrice || item.price) * item.quantity;

                    // Return stock for cancelled item
                    Product.findByIdAndUpdate(
                        item.product._id,
                        { $inc: { stock: item.quantity } }
                    ).catch(err => console.error('Error updating stock:', err));
                }
                return item;
            });

            // If all items are cancelled, cancel the entire order
            if (order.items.every(item => item.cancelled)) {
                order.orderStatus = 'Cancelled';
                order.cancelReason = reason;
                order.cancelledAt = new Date();
            } else {
                order.orderStatus = 'Partially Cancelled';
            }

            // Recalculate order totals
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

        // Process refund for online payments
        if (order.paymentMethod === 'razorpay' && order.paymentDetails.status === 'paid' && refundAmount > 0) {
            const refundSuccess = await refundToWallet(
                req.session.user.id,
                order._id,
                refundAmount
            );

            if (!refundSuccess) {
                console.error('Failed to process refund to wallet');
                // You might want to mark this for manual review
                // or implement a retry mechanism
            }
        }

        await order.save();

        res.json({
            success: true,
            message: cancelType === 'full' ? 
                'Order cancelled successfully' : 
                'Selected items cancelled successfully',
            refundAmount: refundAmount > 0 ? refundAmount : undefined
        });

    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order'
        });
    }
};
const processReturn = async (req, res) => {
    try {
        const { orderId, returnType, items, reason, description } = req.body;

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

        // Check if return is within 7 days of delivery
        const returnWindow = new Date(order.deliveredAt);
        returnWindow.setDate(returnWindow.getDate() + 7);

        if (new Date() > returnWindow) {
            return res.status(400).json({
                success: false,
                message: 'Return window has expired'
            });
        }

        let refundAmount = 0;

        if (returnType === 'full') {
            // Process full return
            order.items.forEach(item => {
                if (!item.cancelled && !item.returned) {
                    item.returned = true;
                    item.returnedAt = new Date();
                    item.returnReason = reason;
                    item.returnDescription = description;
                    item.returnStatus = 'Pending';
                    
                    refundAmount += (item.discountPrice || item.price) * item.quantity;
                }
            });

            order.returnDetails = {
                isReturned: true,
                returnedAt: new Date(),
                status: 'Pending',
                refundAmount,
                refundStatus: 'Pending'
            };
            
            order.orderStatus = 'Return Pending'; // Changed from 'Return Pending'
        } else {
            // Process partial return
            order.items = order.items.map(item => {
                if (items.includes(item._id.toString()) && !item.cancelled && !item.returned) {
                    item.returned = true;
                    item.returnedAt = new Date();
                    item.returnReason = reason;
                    item.returnDescription = description;
                    item.returnStatus = 'Pending';
                    
                    refundAmount += (item.discountPrice || item.price) * item.quantity;
                }
                return item;
            });

            order.returnDetails = {
                isReturned: true,
                returnedAt: new Date(),
                status: 'Pending',
                refundAmount,
                refundStatus: 'Pending'
            };

            const allItemsReturned = order.items.every(item => item.returned || item.cancelled);
            order.orderStatus = allItemsReturned ? 'Return Pending' : 'Partial Return Pending';
        }

        await order.save();

        res.json({
            success: true,
            message: 'Return request submitted successfully'
        });

    } catch (error) {
        console.error('Process return error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process return request'
        });
    }
};



module.exports = { getOrders, getOrderDetails, cancelOrder, processReturn }