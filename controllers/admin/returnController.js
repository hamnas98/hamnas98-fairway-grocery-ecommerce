const Order = require('../../models/Order');
const Wallet = require('../../models/Wallet');
const {refundToWallet} = require('../../controllers/user/walletController')

const getReturns = async (req, res) => {
    try {
        const allReturns = await Order.find({
            'returnDetails.isReturned': true
        })
        .populate('user', 'name email')
        .populate('items.product')
        .sort({ 'returnDetails.returnedAt': -1 });

        // Calculate stats
        const totalReturns = allReturns.length;
        const pendingReturns = allReturns.filter(order => order.returnDetails.status === 'Pending');
        const processingReturns = allReturns.filter(order => order.returnDetails.status === 'Processing');
        const completedReturns = allReturns.filter(order => order.returnDetails.status === 'Completed');

        res.render('adminReturns', {
            returns: allReturns,
            pendingCount: pendingReturns.length,
            processingCount: processingReturns.length,
            completedCount: completedReturns.length,
            totalReturns,
            path: '/admin/returns'
        });

    } catch (error) {
        console.error('Get returns error:', error);
        req.flash('error', 'Failed to load return requests');
        res.redirect('/admin/dashboard');
    }
};

const getReturnDetails = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user')
            .populate('items.product')
            .populate('deliveryAddress');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Return request not found'
            });
        }

        if (!order.returnDetails.isReturned) {
            return res.status(400).json({
                success: false,
                message: 'This order has no return request'
            });
        }

        res.json({
            success: true,
            order
        });

    } catch (error) {
        console.error('Get return details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load return details'
        });
    }
};

const approveReturn = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Update return status
        order.returnDetails.status = 'Processing';
        order.orderStatus = order.items.every(item => item.returned) ? 
            'Return Processing' : 'Partially Returned';

        await order.save();

        res.json({
            success: true,
            message: 'Return request approved'
        });

    } catch (error) {
        console.error('Approve return error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve return'
        });
    }
};

const completeReturn = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Process refund
        const refundSuccess = await refundToWallet(
            order.user,
            orderId,
            order.returnDetails.refundAmount
        );

        if (!refundSuccess) {
            return res.status(500).json({
                success: false,
                message: 'Failed to process refund'
            });
        }

        // Update order status
        order.returnDetails.status = 'Completed';
        order.returnDetails.refundStatus = 'Completed';
        order.orderStatus = order.items.every(item => item.returned) ? 
            'Return Completed' : 'Partially Returned';

        await order.save();

        res.json({
            success: true,
            message: 'Return completed and refund processed'
        });

    } catch (error) {
        console.error('Complete return error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete return'
        });
    }
};

const rejectReturn = async (req, res) => {
    try {
        const { orderId, reason } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Update return status
        order.returnDetails.status = 'Rejected';
        order.returnDetails.refundStatus = 'Rejected';
        order.returnDetails.rejectionReason = reason;
        order.orderStatus = 'Return Rejected';

        // Update individual items
        order.items.forEach(item => {
            if (item.returned) {
                item.returned = false;
                item.returnStatus = 'Rejected';
            }
        });

        await order.save();

        res.json({
            success: true,
            message: 'Return request rejected'
        });

    } catch (error) {
        console.error('Reject return error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject return'
        });
    }
};
module.exports = { getReturns, getReturnDetails, approveReturn, completeReturn, rejectReturn }