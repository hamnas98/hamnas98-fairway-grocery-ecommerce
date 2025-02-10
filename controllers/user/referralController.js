const ReferralService = require('../../utils/referralService');
const Category = require('../../models/Category');

const getReferralDetails = async (req, res) => {
        try {

               // Get all parent categories for the header
        const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        });
            const stats = await ReferralService.getReferralStats(req.session.user.id);
            res.render('referral', {
                referralDetails: stats,
                user: req.session.user,
                parentCategories
            });
        } catch (error) {
            console.error('Get referral details error:', error);
            req.flash('error', 'Failed to load referral details');
            res.redirect('/dashboard');
        }
};

const applyReferralCode = async (req, res) => {
        try {
            const { code } = req.body;
            const userId = req.session.user.id;

            await ReferralService.processReferral(code, userId);
            
            req.flash('success', 'Referral code applied successfully');
            res.redirect('/dashboard');
        } catch (error) {
            console.error('Apply referral code error:', error);
            req.flash('error', error.message || 'Failed to apply referral code');
            res.redirect('/dashboard');
        }
};


module.exports = { getReferralDetails, applyReferralCode };