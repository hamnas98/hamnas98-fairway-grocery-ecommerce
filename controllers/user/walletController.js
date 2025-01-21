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

const refundToWallet = async (userId, orderId, amount) => {
    try {
        let wallet = await Wallet.findOne({ user: userId });
        const order = await Order.findById(orderId);
        
        if (!wallet) {
            wallet = new Wallet({
                user: userId,
                balance: 0,
                transactions: []
            });
        }

        // Add refund transaction
        wallet.transactions.push({
            type: 'credit',
            amount: amount,
            description: order.orderStatus === 'Partially Cancelled' ? 
                `Partial refund for order #${orderId}` :
                `Refund for order #${orderId}`,
            orderId: orderId,
            status: 'Completed'
        });

        // Get the ID of the newly added transaction
        const transactionId = wallet.transactions[wallet.transactions.length - 1]._id;

        // Update order with refund details
        order.refundDetails = {
            amount: amount,
            processedAt: new Date(),
            status: 'Completed',
            walletTransactionId: transactionId
        };

        // Update wallet balance
        wallet.balance += amount;

        // Save both wallet and order
        await Promise.all([
            wallet.save(),
            order.save()
        ]);

        return true;
    } catch (error) {
        console.error('Refund to wallet error:', error);
        return false;
    }
};


module.exports = { getWallet, refundToWallet }
