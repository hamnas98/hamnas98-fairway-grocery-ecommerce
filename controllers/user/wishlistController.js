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

module.exports = { getWishlist }