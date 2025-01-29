const Wallet = require('../../models/Wallet');
const Order = require('../../models/Order');
const Category = require('../../models/Category');

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
        console.log('Refund to wallet initiated:', { userId, orderId, amount });
        
        let wallet = await Wallet.findOne({ user: userId });
        const order = await Order.findById(orderId);
        
        if (!wallet) {
            console.log('Creating new wallet for user');
            wallet = new Wallet({
                user: userId,
                balance: 0,
                transactions: []
            });
        }

        const description = order.orderStatus === 'Partially Cancelled' ? 
            `Partial refund for order #${orderId}` :
            `Refund for order #${orderId}`;

        // Add refund transaction
        const transaction = {
            type: 'credit',
            amount: amount,
            description,
            orderId: orderId,
            status: 'Completed'
        };

        console.log('Creating wallet transaction:', transaction);
        wallet.transactions.push(transaction);

        // Get the ID of the newly added transaction
        const transactionId = wallet.transactions[wallet.transactions.length - 1]._id;

        // Update order with refund details
        order.refundDetails = {
            amount: amount,
            processedAt: new Date(),
            status: 'Completed',
            walletTransactionId: transactionId
        };

        console.log('Current wallet balance:', wallet.balance);
        console.log('Adding refund amount:', amount);
        
        // Update wallet balance
        wallet.balance += amount;

        console.log('New wallet balance:', wallet.balance);

        // Save both wallet and order
        await Promise.all([
            wallet.save(),
            order.save()
        ]);

        console.log('Refund processed successfully');
        return true;
    } catch (error) {
        console.error('Refund to wallet error:', error);
        return false;
    }
};



module.exports = { getWallet, refundToWallet }

