const Product = require('../../models/Product');
const Category = require('../../models/Category');

const getInventory = async (req, res) => {
    try {
        const products = await Product.find({ isDeleted: false })
            .populate('category')
            .sort('name');

        const categories = await Category.find({ isDeleted: false });

        // Calculate stats
        const totalProducts = products.length;
        const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 10).length;
        const outOfStockProducts = products.filter(p => p.stock === 0).length;

        res.render('inventory', {
            products,
            categories,
            totalProducts,
            lowStockProducts,
            outOfStockProducts,
            pageTitle: 'Inventory Management',
            path:'/admin/Inventory'
        });
    } catch (error) {
        console.error('Get inventory error:', error);
        req.flash('error', 'Failed to load inventory');
        res.redirect('/admin/dashboard');
    }
};

module.exports = { getInventory }