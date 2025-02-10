const razorpay = require('../../config/razorpay');
const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Address = require('../../models/Address');
const Product = require('../../models/Product');
const Coupon = require('../../models/Coupon');
const Wallet = require('../../models/Wallet');
const crypto = require('crypto');
const ReferralService = require('../../utils/referralService');



const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
 
        if (!req.session.paymentIntent || req.session.paymentIntent.razorpayOrderId !== razorpay_order_id) {
            return res.status(400).json({ success: false, message: 'Invalid payment session' });
        }
 
        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");
 
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        // Find and update the existing order
        const order = await Order.findById(req.session.paymentIntent.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Update the order with payment details
        order.orderStatus = 'Processing';
        order.processingAt = new Date();
        order.paymentDetails = {
            ...order.paymentDetails,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            status: 'paid',
            paidAt: new Date()
        };
        

        await order.save();

        // Update wallet transaction status if wallet was used
        if (req.session.paymentIntent.walletAmount > 0) {
            const wallet = await Wallet.findOne({ user: req.session.user.id });
            if (wallet) {
                const pendingTransaction = wallet.transactions.find(t => 
                    t.status === 'Pending' && 
                    t.amount === req.session.paymentIntent.walletAmount
                );
                
                if (pendingTransaction) {
                    pendingTransaction.status = 'Completed';
                    pendingTransaction.orderId = order._id;
                    await wallet.save();
                }
            }
        }
 
        // Update stock and clear cart
        const cart = await Cart.findOne({ user: req.session.user.id });
        if (cart) {
            await Promise.all([
                ...cart.items.map(item => 
                    Product.findByIdAndUpdate(item.product._id, {
                        $inc: { stock: -item.quantity }
                    })
                ),
                Cart.findByIdAndDelete(cart._id)
            ]);
        }
 
        // Clear payment intent
        delete req.session.paymentIntent;
 
        res.json({
            success: true,
            message: 'Payment verified successfully'
        });
 
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment'
        });
    }
};

const createRazorpayOrder = async (req, res) => {
    try {
        const { addressId, couponCode, useWallet, walletAmount } = req.body;
 
        const [address, cart, coupon, wallet] = await Promise.all([
            Address.findOne({ _id: addressId, user: req.session.user.id, isDeleted: false }),
            Cart.findOne({ user: req.session.user.id }).populate('items.product'),
            couponCode ? Coupon.findOne({ code: couponCode }) : null,
            useWallet ? Wallet.findOne({ user: req.session.user.id }) : null
        ]);

        // Standard validations...
        if (!address || !cart || cart.items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: !address ? 'Invalid delivery address' : 'Your cart is empty' 
            });
        }

        // Calculate amounts...
        let finalAmount = cart.discountTotal;
        let walletPaymentAmount = 0;

        if (coupon) {
            const couponDiscount = coupon.discountType === 'percentage' 
                ? (cart.discountTotal * coupon.discountAmount / 100)
                : coupon.discountAmount;
            finalAmount = cart.discountTotal - couponDiscount;
        }

        if (useWallet && wallet && walletAmount > 0) {
            if (wallet.balance < walletAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient wallet balance'
                });
            }
            walletPaymentAmount = Math.min(walletAmount, finalAmount);
            finalAmount -= walletPaymentAmount;

            // Create pending wallet transaction
            const walletTransaction = {
                type: 'debit',
                amount: walletPaymentAmount,
                description: 'Partial payment for order',
                status: 'Pending'
            };
            
            wallet.balance -= walletPaymentAmount;
            wallet.transactions.push(walletTransaction);
            await wallet.save();
        }

        // Create Razorpay order first
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(finalAmount * 100),
            currency: 'INR',
            receipt: `order_${Date.now()}`
        });

        // Then create our database order
        const order = new Order({
            user: req.session.user.id,
            items: cart.items,
            deliveryAddress: address._id,
            paymentMethod: walletPaymentAmount > 0 ? 'wallet_razorpay' : 'razorpay',
            total: cart.total,
            discountTotal: finalAmount,
            walletAmount: walletPaymentAmount,
            coupon: coupon?._id,
            couponDiscount: coupon ? (cart.discountTotal - finalAmount) : 0,
            orderStatus: 'Payment Pending',
            paymentDetails: {
                razorpayOrderId: razorpayOrder.id,
                status: 'pending'
            }
        });

        await order.save();

        // Store payment intent with new order ID
        req.session.paymentIntent = {
            orderId: order._id,
            razorpayOrderId: razorpayOrder.id,
            amount: finalAmount,
            walletAmount: walletPaymentAmount,
            createdAt: new Date()
        };
        await ReferralService.processFirstPurchaseReward(req.session.user.id);

        res.json({
            success: true,
            razorpayKey: process.env.RAZORPAY_KEY_ID,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            orderId: razorpayOrder.id,
            mongoOrderId: order._id,
            userInfo: {
                name: req.session.user.name,
                email: req.session.user.email,
                phone: address.mobile
            }
        });

    } catch (error) {
        console.error('Create Razorpay order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize payment'
        });
    }
};

const cancelPayment = async (req, res) => {
    try {
        const { orderId, useWallet, walletAmount } = req.body;

        console.log('Cancel payment request:', { orderId, useWallet, walletAmount });

        // If there's an orderId, find and handle the existing order
        if (orderId) {
            const order = await Order.findOne({ 
                _id: orderId, 
                user: req.session.user.id,
                orderStatus: 'Payment Pending'
            });

            if (order) {
                // Handle wallet refund if wallet was used
                if (order.walletAmount > 0) {
                    const wallet = await Wallet.findOne({ user: req.session.user.id });
                    if (wallet) {
                        // Find and update the pending transaction
                        const pendingTransaction = wallet.transactions
                            .slice()
                            .reverse()
                            .find(t => t.status === 'Pending' && t.amount === order.walletAmount);

                        if (pendingTransaction) {
                            pendingTransaction.status = 'Failed';
                            pendingTransaction.description += ' (Payment Cancelled)';
                            wallet.balance += order.walletAmount;

                            wallet.transactions.push({
                                type: 'credit',
                                amount: order.walletAmount,
                                description: 'Refund for cancelled payment',
                                status: 'Completed',
                                orderId: order._id
                            });

                            await wallet.save();
                        }
                    }
                }

                // Delete the pending order
                await Order.findByIdAndDelete(orderId);
            }
        }

        // Clear payment intent
        if (req.session.paymentIntent) {
            delete req.session.paymentIntent;
        }

        res.json({
            success: true,
            message: 'Payment cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel payment'
        });
    }
};
const updatePaymentStatus = async (req, res) => {
    try {
        console.log('Received request to update payment status:', req.body);
        const { orderId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            console.log('Invalid order ID:', orderId);
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID'
            });
        }
        
        const order = await Order.findOne({
            _id: orderId,
            user: req.session.user.id
        });

        if (!order) {
            console.log('Order not found for given ID and user:', orderId);
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // If wallet was used, make sure transaction is marked as pending
        if (order.walletAmount > 0) {
            const wallet = await Wallet.findOne({ user: req.session.user.id });
            if (wallet) {
                // Check if there's already a transaction for this order
                const existingTransaction = wallet.transactions.find(t => 
                    t.orderId?.toString() === orderId.toString()
                );

                if (!existingTransaction) {
                    // Create a new pending transaction
                    wallet.transactions.push({
                        type: 'debit',
                        amount: order.walletAmount,
                        description: `Payment for order #${orderId}`,
                        status: 'Pending',
                        orderId: order._id
                    });

                    await wallet.save();
                    console.log('Created new pending wallet transaction');
                }
            }
        }

        // Update order status
        order.orderStatus = 'Payment Pending';
        order.paymentDetails.status = 'payment_pending';
        await order.save();

        console.log('Order status updated successfully:', {
            orderId: order._id,
            newStatus: order.orderStatus
        });

        res.json({
            success: true,
            message: 'Payment status updated successfully'
        });
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment status'
        });
    }
};



const continuePayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        
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

        if (!['Payment Pending'].includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order status for payment continuation'
            });
        }

        // Calculate amount to be paid (excluding wallet amount if used)
        let amountToPay = order.discountTotal;
        if (order.walletAmount) {
            amountToPay -= order.walletAmount;
        }

        // Create new Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(amountToPay * 100),
            currency: 'INR',
            receipt: `retry_${orderId}`
        });

        // Store payment intent
        req.session.paymentIntent = {
            razorpayOrderId: razorpayOrder.id,
            orderId: order._id,
            amount: amountToPay,
            createdAt: new Date()
        };

        // Get address for user info
        const address = await Address.findById(order.deliveryAddress);

        res.json({
            success: true,
            razorpayKey: process.env.RAZORPAY_KEY_ID,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            orderId: razorpayOrder.id,
            userInfo: {
                name: req.session.user.name,
                email: req.session.user.email,
                phone: address.mobile
            }
        });
    } catch (error) {
        console.error('Continue payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize payment'
        });
    }
};

const deletePendingOrder = async (req, res) => {
    try {
        console.log('Received request to delete pending order:', req.body);
        const { orderId } = req.body;

        const order = await Order.findOne({
            _id: orderId,
            user: req.session.user.id,
            orderStatus: 'Payment Pending'
        });

        if (!order) {
            console.log(`Order not found or cannot be deleted: ${orderId}`);
            return res.status(404).json({
                success: false,
                message: 'Order not found or cannot be deleted'
            });
        }

        // Handle wallet refund
        if (order.walletAmount > 0) {
            console.log(`Processing wallet refund of ${order.walletAmount}`);
            const wallet = await Wallet.findOne({ user: req.session.user.id });

            if (wallet) {
                // Find all transactions related to this order
                const orderTransactions = wallet.transactions.filter(t => 
                    t.orderId?.toString() === orderId.toString()
                );

                // Mark all pending transactions as failed
                orderTransactions.forEach(transaction => {
                    if (transaction.status === 'Pending') {
                        transaction.status = 'Failed';
                        transaction.description += ' (Order Cancelled)';
                    }
                });

                // Check if we need to refund
                const needsRefund = orderTransactions.some(t => 
                    t.type === 'debit' && 
                    (t.status === 'Failed' || t.status === 'Completed')
                );

                if (needsRefund) {
                    // Add refund to balance
                    wallet.balance += order.walletAmount;

                    // Create refund transaction
                    wallet.transactions.push({
                        type: 'credit',
                        amount: order.walletAmount,
                        description: `Refund for cancelled order #${orderId}`,
                        status: 'Completed',
                        orderId: order._id
                    });

                    console.log(`Wallet refund processed. New balance: ${wallet.balance}`);
                }

                await wallet.save();
            }
        }

        // Delete the order
        await Order.findByIdAndDelete(orderId);
        console.log('Order deleted successfully');

        res.json({
            success: true,
            message: 'Order cancelled and refunded successfully'
        });

    } catch (error) {
        console.error('Delete pending order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete order'
        });
    }
};


module.exports = { createRazorpayOrder, verifyPayment, cancelPayment, updatePaymentStatus, continuePayment, deletePendingOrder };