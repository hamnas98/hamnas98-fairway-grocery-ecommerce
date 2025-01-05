const Product = require('../../models/Product');
const Category = require('../../models/Category');
const StockHistory = require('../../models/StockHistory');

const getInventory = async (req, res) => {
    try {
        const products = await Product.find({ isDeleted: false })
            .populate('category')
            .sort({ updatedAt: -1 });

        const lowStockCount = products.filter(p => p.stock <= p.lowStockAlert).length;
        const outOfStockCount = products.filter(p => p.stock === 0).length;

        const categories = await Category.find({ isDeleted: false });

        res.render('inventory', {
            products,
            categories,
            lowStockCount,
            outOfStockCount,
            totalProducts: products.length,
            totalProducts: products.length,
            getStockClass: helpers.getStockClass,        // Add these helper functions
            getStockStatusClass: helpers.getStockStatusClass,
            getStockStatus: helpers.getStockStatus,
            path:'/admin/inventory'
        });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load inventory' 
        });
    }
};
const helpers = {
    getStockClass: (stock) => {
        if (stock === 0) return 'out';
        if (stock <= 10) return 'low';  // You can adjust this threshold
        return 'normal';
    },

    getStockStatusClass: (stock) => {
        if (stock === 0) return 'out-of-stock';
        if (stock <= 10) return 'low-stock';
        return 'in-stock';
    },

    getStockStatus: (stock) => {
        if (stock === 0) return 'Out of Stock';
        if (stock <= 10) return 'Low Stock';
        return 'In Stock';
    }
};

module.exports = { getInventory }