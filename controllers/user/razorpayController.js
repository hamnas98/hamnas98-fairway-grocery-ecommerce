const razorpay = require('../../config/razorpay');
const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Address = require('../../models/Address');
const Product = require('../../models/Product');
const crypto = require('crypto');

const createRazorpayOrder = async (req, res) => {
    try {
        const { addressId } = req.body;

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

        // Get cart with populated products
        const cart = await Cart.findOne({ user: req.session.user.id })
            .populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty'
            });
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

        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(cart.discountTotal * 100),
            currency: 'INR',
            receipt: `order_${Date.now()}`
        });

        // Create order in pending state
        req.session.paymentIntent = {
            razorpayOrderId: razorpayOrder.id,
            addressId,
            cartId: cart._id,
            amount: cart.discountTotal,
            createdAt: new Date()
        };

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
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature
        } = req.body;

        // Verify the payment intent exists in session
        if (!req.session.paymentIntent || 
            req.session.paymentIntent.razorpayOrderId !== razorpay_order_id) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment session'
            });
        }

        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        // Get cart and address
        const [cart, address] = await Promise.all([
            Cart.findById(req.session.paymentIntent.cartId).populate('items.product'),
            Address.findById(req.session.paymentIntent.addressId)
        ]);

        if (!cart || !address) {
            return res.status(404).json({
                success: false,
                message: 'Cart or address not found'
            });
        }

        // Create order after payment verification
        const order = new Order({
            user: req.session.user.id,
            items: cart.items,
            deliveryAddress: address,
            paymentMethod: 'razorpay',
            total: cart.total,
            discountTotal: cart.discountTotal,
            orderStatus: 'Processing',
            paymentDetails: {
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                status: 'paid',
                paidAt: new Date()
            }
        });

        await order.save();

        // Update stock and clear cart
        await Promise.all([
            ...cart.items.map(item => 
                Product.findByIdAndUpdate(item.product._id, {
                    $inc: { stock: -item.quantity }
                })
            ),
            Cart.findByIdAndDelete(cart._id)
        ]);

        // Clear payment intent from session
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
        // Clear payment intent from session
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

module.exports = { createRazorpayOrder, verifyPayment, cancelPayment };