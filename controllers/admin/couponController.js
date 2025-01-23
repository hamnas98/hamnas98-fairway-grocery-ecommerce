const Coupon = require('../../models/Coupon');

const getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.render('coupons', {
            coupons,
            path: '/admin/coupons'
        });
    } catch (error) {
        console.error('Get coupons error:', error);
        req.flash('error', 'Failed to load coupons');
        res.redirect('/admin/dashboard');
    }
};

const createCoupon = async (req, res) => {
    try {
        const {
            code,
            description,
            discountType,
            discountAmount,
            minimumPurchase,
            maximumDiscount,
            startDate,
            endDate,
            usageLimit
        } = req.body;

        await Coupon.create({
            code: code.toUpperCase(),
            description,
            discountType,
            discountAmount,
            minimumPurchase,
            maximumDiscount,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            usageLimit: usageLimit || null
        });

        res.json({
            success: true,
            message: 'Coupon created successfully'
        });
    } catch (error) {
        console.error('Create coupon error:', error);
        res.status(500).json({
            success: false,
            message: error.code === 11000 ? 'Coupon code already exists' : 'Failed to create coupon'
        });
    }
};

const deleteCoupon = async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.json({
            success: true,
            message: 'Coupon deleted successfully'
        });
    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete coupon'
        });
    }
};


module.exports = { getCoupons, createCoupon , deleteCoupon };