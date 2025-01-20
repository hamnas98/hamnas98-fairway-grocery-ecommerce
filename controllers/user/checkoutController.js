const Cart = require('../../models/Cart');
const Address = require('../../models/Address');
const Category = require('../../models/Category');
const Order = require('../../models/Order');
const Product = require('../../models/Product');



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

        res.render('checkout', {
            parentCategories,
            cart,
            addresses,
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
        const { addressId, paymentMethod } = req.body;

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

        // Create order
        const order = new Order({
            user: req.session.user.id,
            items: cart.items,
            deliveryAddress: address,
            paymentMethod,
            total: cart.total,
            discountTotal: cart.discountTotal,
            orderStatus: paymentMethod === 'cod' ? 'Pending' : 'Processing'
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

module.exports = { getCheckoutPage, placeOrder }