const Wishlist = require('../../models/Wishlist');
const Product = require('../../models/Product');
const Category = require('../../models/Category');

const getWishlist = async (req, res) => {
    try {

        console.log('whislist')
        const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        });

        const wishlist = await Wishlist.findOne({ user: req.session.user.id })
            .populate('products');

        res.render('wishlist', {
            parentCategories,
            wishlist,
            user: req.session.user
        });

    } catch (error) {
        console.error('Get wishlist error:', error);
        req.flash('error', 'Failed to load wishlist');
        res.redirect('/error');
    }
};

const toggleWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        console.log('Request body:', req.body); // Debug log

        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Please login to manage wishlist'
            });
        }

        let wishlist = await Wishlist.findOne({ user: req.session.user.id });
        console.log('Found wishlist:', wishlist); // Debug log
        
        // Create new wishlist if doesn't exist
        if (!wishlist) {
            wishlist = new Wishlist({ 
                user: req.session.user.id,
                products: []
            });
        }

        // Convert product IDs to strings for comparison
        const productIndex = wishlist.products.findIndex(id => 
            id.toString() === productId.toString()
        );
        console.log('Product index:', productIndex); // Debug log
        
        let message;

        if (productIndex === -1) {
            // Add to wishlist
            wishlist.products.push(productId);
            message = 'Product added to wishlist';
        } else {
            // Remove from wishlist
            wishlist.products.splice(productIndex, 1);
            message = 'Product removed from wishlist';
        }

        await wishlist.save();

        res.json({
            success: true,
            message,
            inWishlist: productIndex === -1
        });

    } catch (error) {
        console.error('Toggle wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update wishlist'
        });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        
        const wishlist = await Wishlist.findOne({ user: req.session.user.id });
        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist not found'
            });
        }

        wishlist.products = wishlist.products.filter(id => 
            id.toString() !== productId
        );

        await wishlist.save();

        res.json({
            success: true,
            message: 'Product removed from wishlist'
        });

    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove from wishlist'
        });
    }
};

module.exports = { getWishlist, toggleWishlist, removeFromWishlist }