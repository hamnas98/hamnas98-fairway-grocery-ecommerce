const Wallet = require('../../models/Wallet');
const Order = require('../../models/Order');
const Category = require('../../models/Category')

const getWallet = async (req, res) => {
    try {
        let wallet = await Wallet.findOne({ user: req.session.user.id });
        
        // Create wallet if doesn't exist
        if (!wallet) {
            wallet = new Wallet({
                user: req.session.user.id,
                balance: 0,
                transactions: []
            });
            await wallet.save();
        }

        // Get all parent categories for the header
        const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        });

        res.render('wallet', {
            wallet,
            parentCategories,
            user: req.session.user,
            pageTitle: 'My Wallet'
        });

    } catch (error) {
        console.error('Get wallet error:', error);
        req.flash('error', 'Failed to load wallet');
        res.redirect('/dashboard');
    }
};

module.exports = { getWallet }
