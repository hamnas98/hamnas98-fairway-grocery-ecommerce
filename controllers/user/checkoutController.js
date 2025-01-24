const Cart = require('../../models/Cart');
const Address = require('../../models/Address');
const Category = require('../../models/Category');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Coupon = require('../../models/Coupon')


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

        res.render('checkout', {
            parentCategories,
            cart,
            addresses,
            activeCoupons,
            user:req.session.user,
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
        console.log(req.body)
        const { addressId, paymentMethod, couponCode } = req.body;

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

        // Create order
        const order = new Order({
            user: req.session.user.id,
            items: cart.items,
            deliveryAddress: address,
            paymentMethod,
            total: cart.total,
            discountTotal: finalAmount,
            orderStatus: paymentMethod === 'cod' ? 'Pending' : 'Processing',
            coupon: coupon?._id,
            couponDiscount: coupon ? (cart.discountTotal - finalAmount) : 0,
            processingAt:new Date()
           
        });

        await order.save();

        // Update product stock
        for (const item of cart.items) {
            await Product.findByIdAndUpdate(item.product._id, {
                $inc: { stock: -item.quantity }
            });
        }

        // Clear cart
        await Cart.findByIdAndDelete(cart._id);

        res.json({
            success: true,
            message: 'Order placed successfully',
            orderId: order._id
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

        // Validate minimum purchase against discounted total
        if (cart.discountTotal < coupon.minimumPurchase) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase of ₹${coupon.minimumPurchase} required`
            });
        }

        // Calculate discount based on discounted total
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

module.exports = { getCheckoutPage, placeOrder, applyCoupon }