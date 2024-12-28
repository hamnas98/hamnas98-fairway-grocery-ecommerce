const Cart = require('../../models/Cart');
const Address = require('../../models/Address');
const Category = require('../../models/Category');

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

module.exports = { getCheckoutPage }