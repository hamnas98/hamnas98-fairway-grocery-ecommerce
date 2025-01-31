const razorpay = require('../../config/razorpay');
const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Address = require('../../models/Address');
const Product = require('../../models/Product');
const Coupon = require('../../models/Coupon');
const Wallet = require('../../models/Wallet');
const crypto = require('crypto');

const createRazorpayOrder = async (req, res) => {
    try {
        const { addressId, couponCode, useWallet, walletAmount  } = req.body;
 
        const [address, cart, coupon, wallet] = await Promise.all([
            Address.findOne({ _id: addressId, user: req.session.user.id, isDeleted: false }),
            Cart.findOne({ user: req.session.user.id }).populate('items.product'),
            couponCode ? Coupon.findOne({ code: couponCode }) : null,
            useWallet ? Wallet.findOne({ user: req.session.user.id }) : null
        ]);
 
        if (!address) {
            return res.status(400).json({ success: false, message: 'Invalid delivery address' });
        }
 
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty' });
        }
 
        // Validate stock
        for (const item of cart.items) {
            if (!item.product || item.quantity > item.product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `${item.product ? item.product.name : 'A product'} is out of stock`
                });
            }
        }
 
        // Calculate final amount with coupon discount
        let finalAmount = cart.discountTotal;
        if (coupon) {
            const couponDiscount = coupon.discountType === 'percentage' 
                ? (cart.discountTotal * coupon.discountAmount / 100)
                : coupon.discountAmount;
            finalAmount = cart.discountTotal - couponDiscount;
        }
        // Handle wallet payment
        let walletPaymentAmount = 0;
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
                description: 'Partial payment for order #${orderId}',
                status: 'Pending'
            };
            
            wallet.balance -= walletPaymentAmount;
            wallet.transactions.push(walletTransaction);
            await wallet.save();
        }
 
        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(finalAmount * 100),
            currency: 'INR',
            receipt: `order_${Date.now()}`
        });
 
        // Store payment intent
        req.session.paymentIntent = {
            razorpayOrderId: razorpayOrder.id,
            addressId,
            cartId: cart._id,
            amount: finalAmount,
            walletAmount: walletPaymentAmount,
            couponCode,
            createdAt: new Date()
        };
 
        console.log(req.session.paymentIntent);
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
        console.error('Create Razorpay order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize payment'
        });
    }
 };

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
 
        // Get cart, address and coupon
        const [cart, address, coupon, wallet] = await Promise.all([
            Cart.findById(req.session.paymentIntent.cartId).populate('items.product'),
            Address.findById(req.session.paymentIntent.addressId),
            req.session.paymentIntent.couponCode ? 
                Coupon.findOne({ code: req.session.paymentIntent.couponCode }) : null,
            req.session.paymentIntent.useWallet ?
                Wallet.findOne({ user: req.session.user.id }) : null
        ]);
 
        if (!cart || !address) {
            return res.status(404).json({ success: false, message: 'Cart or address not found' });
        }
 
        // Calculate final amount with coupon
        let finalAmount = cart.discountTotal;
        if (coupon) {
            const couponDiscount = coupon.discountType === 'percentage' 
                ? (cart.discountTotal * coupon.discountAmount / 100)
                : coupon.discountAmount;
            finalAmount = cart.discountTotal - couponDiscount;
        }

 
        // Create order after payment verification
        const order = new Order({
            user: req.session.user.id,
            items: cart.items,
            deliveryAddress: address,
            paymentMethod: req.session.paymentIntent.walletAmount > 0 ? 'wallet_razorpay' : 'razorpay',
            total: cart.total,
            discountTotal: finalAmount,
            coupon: coupon?._id,
            couponDiscount: coupon ? (cart.discountTotal - finalAmount) : 0,
            orderStatus: 'Processing',
            processingAt: new Date(),
            paymentDetails: {
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                status: 'paid',
                paidAt: new Date()
            }
        });
 
        await order.save();

             // Update wallet transaction status if wallet was used
             if (wallet && req.session.paymentIntent.walletAmount > 0) {
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
 
        // Update stock and clear cart
        await Promise.all([
            ...cart.items.map(item => 
                Product.findByIdAndUpdate(item.product._id, {
                    $inc: { stock: -item.quantity }
                })
            ),
            Cart.findByIdAndDelete(cart._id)
        ]);
 
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

 const cancelPayment = async (req, res) => {
    try {
        const { useWallet, walletAmount } = req.body;
        console.log('Cancel Payment Request:', { useWallet, walletAmount, sessionIntent: req.session.paymentIntent });

        if (useWallet || (req.session.paymentIntent?.walletAmount > 0)) {
            const actualWalletAmount = walletAmount || req.session.paymentIntent?.walletAmount;
            
            if (actualWalletAmount > 0) {
                const wallet = await Wallet.findOne({ user: req.session.user.id });
                
                if (wallet) {
                    // Find the most recent pending transaction
                    const pendingTransaction = wallet.transactions
                        .slice()
                        .reverse()
                        .find(t => t.status === 'Pending' && t.amount === actualWalletAmount);
                    
                    if (pendingTransaction) {
                        console.log('Found pending transaction:', pendingTransaction);
                        
                        // Update the pending transaction
                        pendingTransaction.status = 'Failed';
                        pendingTransaction.description = `${pendingTransaction.description} (Payment Cancelled)`;
                        
                        // Refund the amount
                        wallet.balance += actualWalletAmount;
                        
                        // Add a refund transaction
                        wallet.transactions.push({
                            type: 'credit',
                            amount: actualWalletAmount,
                            description: 'Refund for cancelled Razorpay payment',
                            status: 'Completed'
                        });

                        await wallet.save();
                        console.log('Wallet updated:', {
                            refundedAmount: actualWalletAmount,
                            newBalance: wallet.balance
                        });
                    } else {
                        console.log('No pending transaction found for wallet amount:', actualWalletAmount);
                    }
                }
            }
        }

        // Clear payment intent
        if (req.session.paymentIntent) {
            console.log('Clearing payment intent from session');
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

module.exports = { createRazorpayOrder, verifyPayment, cancelPayment };