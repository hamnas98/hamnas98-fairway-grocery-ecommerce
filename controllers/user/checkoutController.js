const Cart = require('../../models/Cart');
const Address = require('../../models/Address');
const Category = require('../../models/Category');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Coupon = require('../../models/Coupon')
const Wallet = require('../../models/Wallet');
const ReferralService = require('../../utils/referralService');

const getCheckoutPage = async (req, res) => {
    try {

            // Get all parent categories for the header
            const parentCategories = await Category.find({ 
                parent: null,
                isDeleted: false,
                listed: true 
            });
        // Get user's cart
        const cart = await Cart.findOne({ user: req.session.user.id })
            .populate({
                path: 'items.product',
                select: 'name images price discountPrice quantity unit stock'
            });

        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart');
        }
                // Recalculate totals dynamically based on the latest product data
        if (cart) {
            cart.total = cart.items.reduce((sum, item) => {

                const price = item.product.price;
                return sum + (price * item.quantity);
            }, 0);

            cart.discountTotal = cart.items.reduce((sum, item) => {
  
                const price = item.product.discountPrice || item.product.price;
                return sum + (price * item.quantity);
            }, 0);


            await cart.save();
        }

        // Get user's addresses
        const addresses = await Address.find({ 
            user: req.session.user.id,
            isDeleted: false 
        }).sort({ isDefault: -1 });

        const activeCoupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });
        
        const wallet = await Wallet.findOne({ user: req.session.user.id });

        res.render('checkout', {
            parentCategories,
            cart,
            addresses,
            activeCoupons,
            user:req.session.user,
            wallet,
            pageTitle: 'Checkout'
        });

    } catch (error) {
        console.error('Checkout page error:', error);
        req.flash('error', 'Failed to load checkout page');
        res.redirect('/cart');
    }
};

const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, couponCode, useWallet, walletAmount } = req.body;

        let coupon = null;
        if (couponCode) {
            coupon = await Coupon.findOne({ code: couponCode });
        }
        
        // Validate address
        const address = await Address.findOne({
            _id: addressId,
            user: req.session.user.id,
            isDeleted: false
        });

        if (!address) {
            return res.status(400).json({
                success: false,
                message: 'Invalid delivery address'
            });
        }

        // Get cart
        const cart = await Cart.findOne({ user: req.session.user.id })
            .populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty'
            });
        }

        // Validate stock for all items
        for (const item of cart.items) {
            if (item.quantity > item.product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `${item.product.name} is out of stock`
                });
            }
        }
        let finalAmount = cart.discountTotal;
        if (coupon) {
            const couponDiscount = coupon.discountType === 'percentage' 
                ? (cart.discountTotal * coupon.discountAmount / 100)
                : coupon.discountAmount;
            finalAmount = cart.discountTotal - couponDiscount;
        }
        if (coupon) {
            await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
        }

        if ((paymentMethod === 'cod' || paymentMethod === 'wallet_cod') && finalAmount > 500) {
            return res.status(400).json({
                success: false,
                message: 'Cash on Delivery is not available for orders above ₹500'
            });
        }

        let wallet = null;
        let remainingAmount = finalAmount;
        let walletTransaction = null;

        if (useWallet && walletAmount > 0) {
            wallet = await Wallet.findOne({ user: req.session.user.id });
            
            if (!wallet || wallet.balance < walletAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient wallet balance'
                });
            }
            remainingAmount = finalAmount - walletAmount;

            // Create wallet transaction
            walletTransaction = {
                type: 'debit',
                amount: walletAmount,
                description: `Payment for order `,
                status: 'Pending'
            };

            wallet.balance -= walletAmount;
            wallet.transactions.push(walletTransaction);
            await wallet.save();
        }

        // update payment method based on wallet and remaining amount
        let finalPaymentMethod;
        if (remainingAmount === 0) {
            finalPaymentMethod = 'wallet';
        } else if (useWallet && walletAmount > 0) {
            finalPaymentMethod = paymentMethod === 'cod' ? 'wallet_cod' : 'wallet_razorpay';
        } else {
            finalPaymentMethod = paymentMethod;
        }

        await ReferralService.processFirstPurchaseReward(req.session.user.id);

        // Create order
        const order = new Order({
            user: req.session.user.id,
            items: cart.items,
            deliveryAddress: address,
            paymentMethod: finalPaymentMethod,
            total: cart.total,
            discountTotal: finalAmount,
            orderStatus: finalPaymentMethod === 'cod' || finalPaymentMethod === 'wallet_cod' ? 'Pending' : 'Processing',
            coupon: coupon?._id,
            couponDiscount: coupon ? (cart.discountTotal - finalAmount) : 0,
            walletAmount: walletAmount || 0,
            processingAt: remainingAmount === 0 ? new Date() : null
        });

        await order.save();

        if (wallet && walletTransaction) {
            const transactionIndex = wallet.transactions.length - 1;
            wallet.transactions[transactionIndex].orderId = order._id;
            wallet.transactions[transactionIndex].status = remainingAmount === 0 ? 'Completed' : 'Pending';
            wallet.transactions[transactionIndex].description = `Payment for order #${order._id}`;
            await wallet.save();
        }

        // Update product stock
        for (const item of cart.items) {
            await Product.findByIdAndUpdate(item.product._id, {
                $inc: { stock: -item.quantity }
            });
        }

        // Clear cart
        await Cart.findByIdAndDelete(cart._id);

        // Handle response based on payment method
        if (remainingAmount === 0 || finalPaymentMethod === 'cod' || finalPaymentMethod === 'wallet_cod') {
            return res.json({
                success: true,
                message: 'Order placed successfully',
                orderId: order._id
            });
        }

        return res.json({
            success: true,
            message: 'Order created',
            orderId: order._id,
            remainingAmount: remainingAmount
        });
    } catch (error) {
        console.error('Place order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to place order'
        });
    }
};

const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const cart = await Cart.findOne({ user: req.session.user.id });

        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        if (!coupon) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired coupon'
            });
        }

        // Check usage limit
        if (coupon.usageLimit) {
            const usageCount = await Order.countDocuments({
                'coupon': coupon._id,
                'user': req.session.user.id
            });

            if (usageCount >= coupon.usageLimit) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already used this coupon'
                });
            }

            if (coupon.usedCount >= coupon.usageLimit) {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon usage limit has been reached'
                });
            }
        }

        if (cart.discountTotal < coupon.minimumPurchase) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase of ₹${coupon.minimumPurchase} required`
            });
        }

        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (cart.discountTotal * coupon.discountAmount) / 100;
            if (coupon.maximumDiscount) {
                discount = Math.min(discount, coupon.maximumDiscount);
            }
        } else {
            discount = Math.min(coupon.discountAmount, cart.discountTotal);
        }

        res.json({
            success: true,
            discount,
            finalAmount: cart.discountTotal - discount,
            message: 'Coupon applied successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to apply coupon'
        });
    }
};

module.exports = { getCheckoutPage, placeOrder, applyCoupon };