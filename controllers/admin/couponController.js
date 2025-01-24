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

        // Server-side validation
        if (!code || !/^[A-Z0-9]{3,15}$/.test(code.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coupon code format'
            });
        }

        if (discountType === 'percentage' && (discountAmount <= 0 || discountAmount > 100)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid percentage discount'
            });
        }

        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }

        await Coupon.create({
            code: code.toUpperCase(),
            description,
            discountType,
            discountAmount,
            minimumPurchase: minimumPurchase || 0,
            maximumDiscount: maximumDiscount || null,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            usageLimit: usageLimit || null,
            isActive: true
        });

        res.json({
            success: true,
            message: 'Coupon created successfully'
        });
    } catch (error) {
        console.error('Create coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create coupon'
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