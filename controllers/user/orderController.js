const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const Wallet = require('../../models/Wallet');
const {refundToWallet} = require('../../controllers/user/walletController');
const InvoiceGenerator = require('../../utils/invoiceGenerator');

const getOrders = async (req, res) => {

    try {
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


const calculateRefundAmount = (order, itemsToRefund) => {
    try {

        const orderTotal = order.items.reduce((sum, item) => 
            sum + ((item.discountPrice || item.price) * item.quantity), 0);

   
        const refundItemsTotal = itemsToRefund.reduce((sum, item) => 
            sum + ((item.discountPrice || item.price) * item.quantity), 0);

      
        if (!order.couponDiscount || order.couponDiscount === 0) {
            return refundItemsTotal;
        }

      
        const refundProportion = refundItemsTotal / orderTotal;


        const proportionalCouponDiscount = order.couponDiscount * refundProportion;

      
        const finalRefundAmount = refundItemsTotal - proportionalCouponDiscount;

     
        return Math.max(finalRefundAmount, 0);
    } catch (error) {
        console.error('Error calculating refund amount:', error);
        // Return original items total as fallback
        return itemsToRefund.reduce((sum, item) => 
            sum + ((item.discountPrice || item.price) * item.quantity), 0);
    }
};



const cancelOrder = async (req, res) => {
    try {
        const { orderId, cancelType, items, reason } = req.body;
        const order = await Order.findOne({ _id: orderId, user: req.session.user.id });
        
        console.log('Payment Method:', order.paymentMethod);
        console.log('Wallet Amount:', order.walletAmount);
 
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
 
        if (!['Pending', 'Processing'].includes(order.orderStatus)) {
            return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
        }
 
        let refundAmount = 0;
        let walletRefundAmount = 0;
 
        if (cancelType === 'full') {
            order.orderStatus = 'Cancelled';
            order.cancelReason = reason;
            order.cancelledAt = new Date();
            refundAmount = order.discountTotal;

            // Calculate wallet refund based on payment method
            switch(order.paymentMethod) {
                case 'wallet':
                    walletRefundAmount = refundAmount;
                    break;
                case 'wallet_cod':
                    walletRefundAmount = order.walletAmount || 0;
                    break;
                case 'wallet_razorpay':
                    // Refund wallet amount and razorpay portion if paid
                    walletRefundAmount = order.walletAmount || 0;
                    if (order.paymentDetails.status === 'paid') {
                        walletRefundAmount += (refundAmount - (order.walletAmount || 0));
                    }
                    break;
                case 'razorpay':
                    if (order.paymentDetails.status === 'paid') {
                        walletRefundAmount = refundAmount;
                    }
                    break;
            }

            console.log('Full Cancel - Calculated Refunds:', {
                refundAmount,
                walletRefundAmount,
                orderWalletAmount: order.walletAmount,
                paymentStatus: order.paymentDetails?.status
            });
 
            await Promise.all(order.items.map(item => 
                Product.findByIdAndUpdate(item.product._id, {
                    $inc: { stock: item.quantity }
                })
            ));
        } else {
            const itemsToCancel = order.items.filter(item => items.includes(item._id.toString()));
            refundAmount = calculateRefundAmount(order, itemsToCancel);
 
            // Calculate proportional wallet refund for partial cancellation
            switch(order.paymentMethod) {
                case 'wallet':
                    walletRefundAmount = refundAmount;
                    break;
                case 'wallet_cod':
                    const walletProportion = (order.walletAmount || 0) / order.discountTotal;
                    walletRefundAmount = refundAmount * walletProportion;
                    break;
                case 'wallet_razorpay':
                    const walletRatio = (order.walletAmount || 0) / order.discountTotal;
                    walletRefundAmount = refundAmount * walletRatio;
                    if (order.paymentDetails.status === 'paid') {
                        walletRefundAmount += (refundAmount * (1 - walletRatio));
                    }
                    break;
                case 'razorpay':
                    if (order.paymentDetails.status === 'paid') {
                        walletRefundAmount = refundAmount;
                    }
                    break;
            }

            console.log('Partial Cancel - Calculated Refunds:', {
                refundAmount,
                walletRefundAmount,
                orderWalletAmount: order.walletAmount,
                paymentStatus: order.paymentDetails?.status
            });
            
            order.items = order.items.map(item => {
                if (items.includes(item._id.toString())) {
                    item.cancelled = true;
                    item.cancelledAt = new Date();
                    item.cancelReason = reason;
                    
                    Product.findByIdAndUpdate(item.product._id, {
                        $inc: { stock: item.quantity }
                    }).catch(err => console.error('Error updating stock:', err));
                }
                return item;
            });
 
            order.orderStatus = order.items.every(item => item.cancelled) ? 'Cancelled' : 'Partially Cancelled';
            
            if (order.orderStatus === 'Cancelled') {
                order.cancelReason = reason;
                order.cancelledAt = new Date();
            }
 
            order.total = order.items.reduce((sum, item) => 
                !item.cancelled ? sum + (item.price * item.quantity) : sum, 0);
            order.discountTotal = order.items.reduce((sum, item) => 
                !item.cancelled ? sum + ((item.discountPrice || item.price) * item.quantity) : sum, 0);
        }
 
        // Process wallet refund if applicable
        if (walletRefundAmount > 0) {
            console.log('Processing wallet refund:', {
                walletRefundAmount,
                paymentMethod: order.paymentMethod,
                orderStatus: order.orderStatus,
                refundStatus:'completed'
            });
            
            const refundSuccess = await refundToWallet(
                req.session.user.id, 
                order._id, 
                walletRefundAmount
            );
            
            if (!refundSuccess) {
                console.error('Failed to process refund to wallet');
            }
        } else {
            console.log('No wallet refund needed:', {
                walletRefundAmount,
                paymentMethod: order.paymentMethod,
                orderStatus: order.orderStatus
            });
        }
 
        await order.save();
 
        res.json({
            success: true,
            message: `Order ${cancelType === 'full' ? 'cancelled' : 'items cancelled'} successfully`,
            refundAmount: refundAmount > 0 ? {
                total: refundAmount,
                wallet: walletRefundAmount
            } : undefined
        });
 
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel order' });
    }
};


const processReturn = async (req, res) => {
    try {
        const { orderId, returnType, items, reason, description } = req.body;
        const order = await Order.findOne({ _id: orderId, user: req.session.user.id });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (order.returnDetails.status== 'Rejected') {
            return res.status(400).json({
                success: false,
                message: 'Your return request has been alrady rejected'
            });
        }
        // // Check if order is delivered
        // if (order.orderStatus !== 'Delivered') {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Only delivered orders can be returned'
        //     });
        // }

        // Validate return window (7 days)
        const returnWindow = new Date(order.deliveredAt);
        returnWindow.setDate(returnWindow.getDate() + 7);

        if (new Date() > returnWindow) {
            return res.status(400).json({
                success: false,
                message: 'Return window has expired'
            });
        }

        // For full return, validate all items
        if (returnType === 'full') {
            const hasIneligibleItems = order.items.some(item => {
                if (item.cancelled) return true;
                if (item.returned && ['Pending', 'Processing','Approved', 'Completed'].includes(item.returnStatus)) return true;
                return false;
            });

            if (hasIneligibleItems) {
                return res.status(400).json({
                    success: false,
                    message: 'Some items are not eligible for return'
                });
            }
        } else {
            // For partial return, validate selected items
            for (const itemId of items) {
                const item = order.items.find(i => i._id.toString() === itemId);

                if (!item) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid item selected for return'
                    });
                }

                if (item.cancelled) {
                    return res.status(400).json({
                        success: false,
                        message: `Cannot return cancelled item ${item.product.name}`
                    });
                }

                if (item.returned && ['Pending', 'Processing', ].includes(item.returnStatus)) {
                    return res.status(400).json({
                        success: false,
                        message: `Item ${item.product.name} has already been returned or has a pending return request`
                    });
                }
                if (item.returned && ['Approved' ].includes(item.returnStatus)) {
                    return res.status(400).json({
                        success: false,
                        message: `Item ${item.product.name}  Your return request has been alrady approved`
                    });
                }
                if (item.returned && ['Completed' ].includes(item.returnStatus)) {
                    return res.status(400).json({
                        success: false,
                        message: `Item ${item.product.name}  already returned`
                    });
                }
                if (item.returned && [ 'rejected'].includes(item.returnStatus)) {
                    return res.status(400).json({
                        success: false,
                        message: `Item ${item.product.name} can not be returned`
                    });
                }
            }
        }

        let refundAmount = 0;
        let walletRefundAmount = 0;

        if (returnType === 'full') {
            // Calculate refund for all eligible items (not cancelled and either not returned or rejected returns)
            const eligibleItems = order.items.filter(item => 
                !item.cancelled && (!item.returned || item.returnStatus === 'Rejected')
            );
            refundAmount = calculateRefundAmount(order, eligibleItems);

            if (['wallet', 'wallet_cod', 'wallet_razorpay'].includes(order.paymentMethod)) {
                const walletProportion = order.walletAmount / order.discountTotal;
                walletRefundAmount = refundAmount * walletProportion;
            }
            if (['razorpay', 'wallet_razorpay'].includes(order.paymentMethod) && 
                order.paymentDetails.status === 'paid') {
                const nonWalletAmount = refundAmount - walletRefundAmount;
                walletRefundAmount += nonWalletAmount;
            }

            // Update all eligible items
            order.items = order.items.map(item => {
                if (!item.cancelled && (!item.returned || item.returnStatus === 'Rejected')) {
                    item.returned = true;
                    item.returnedAt = new Date();
                    item.returnReason = reason;
                    item.returnDescription = description;
                    item.returnStatus = 'Pending';
                }
                return item;
            });
        } else {
            // Handle partial return
            const itemsToReturn = order.items.filter(item => 
                items.includes(item._id.toString()) && !item.cancelled
            );
            refundAmount = calculateRefundAmount(order, itemsToReturn);

            if (['wallet', 'wallet_cod', 'wallet_razorpay'].includes(order.paymentMethod)) {
                const walletProportion = order.walletAmount / order.discountTotal;
                walletRefundAmount = refundAmount * walletProportion;
            }
            if (['razorpay', 'wallet_razorpay'].includes(order.paymentMethod) && 
                order.paymentDetails.status === 'paid') {
                const nonWalletAmount = refundAmount - walletRefundAmount;
                walletRefundAmount += nonWalletAmount;
            }

            // Update selected items
            order.items = order.items.map(item => {
                if (items.includes(item._id.toString()) && !item.cancelled) {
                    item.returned = true;
                    item.returnedAt = new Date();
                    item.returnReason = reason;
                    item.returnDescription = description;
                    item.returnStatus = 'Pending';
                }
                return item;
            });
        }

        // Update order return details
        order.returnDetails = {
            isReturned: true,
            returnedAt: new Date(),
            status: 'Pending',
            refundAmount: refundAmount,
            walletRefundAmount: walletRefundAmount,
            refundStatus: 'Pending'
        };

        // Update order status based on return status
        const allItemsReturnedOrCancelled = order.items.every(item => 
            item.returned || item.cancelled
        );
        const someItemsReturnedOrCancelled = order.items.some(item => 
            item.returned || item.cancelled
        );

        if (allItemsReturnedOrCancelled) {
            order.orderStatus = 'Return Pending';
        } else if (someItemsReturnedOrCancelled) {
            order.orderStatus = 'Partially Returned';
        }

        await order.save();

        res.json({
            success: true,
            message: 'Return request submitted successfully',
            refundDetails: {
                total: refundAmount,
                wallet: walletRefundAmount
            }
        });

    } catch (error) {
        console.error('Process return error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to process return request' 
        });
    }
};


const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Find order and populate necessary fields
        const order = await Order.findOne({
            _id: orderId,
            user: req.session.user.id
        }).populate([
            {
                path: 'items.product',
                select: 'name price'
            },
            {
                path: 'deliveryAddress'
            }
        ]);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order is in a state where invoice can be generated
        const validStates = ['Processing', 'Shipped', 'Delivered'];
        if (!validStates.includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invoice can only be downloaded for confirmed orders'
            });
        }

        // Generate invoice
        const invoiceGenerator = new InvoiceGenerator(order);
        const pdfBuffer = await invoiceGenerator.generate();

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);

        // Send the PDF
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Download invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate invoice'
        });
    }
};



module.exports = { getOrders, getOrderDetails, cancelOrder, processReturn, downloadInvoice }