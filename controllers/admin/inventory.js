const Product = require('../../models/Product');
const StockHistory = require('../../models/StockHistory');
const Category = require('../../models/Category');

// Get inventory page with filters
const getInventory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Get filter parameters
        const stockStatus = req.query.stock || 'all';
        const categoryId = req.query.category;
        const search = req.query.search;

        // Build query
        let query = { isDeleted: false };

        // Stock status filter
        if (stockStatus === 'out') {
            query.stock = 0;
        } else if (stockStatus === 'low') {
            query.stock = { $gt: 0, $lte: 10 };
        } else if (stockStatus === 'in') {
            query.stock = { $gt: 10 };
        }

        // Category filter
        if (categoryId && categoryId !== 'all') {
            query.category = categoryId;
        }

        // Search filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } }
            ];
        }

        // Get products with pagination
        const products = await Product.find(query)
            .populate('category')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get counts for stats
        const totalProducts = await Product.countDocuments({ isDeleted: false });
        const lowStockCount = await Product.countDocuments({
            isDeleted: false,
            stock: { $gt: 0, $lte: 10 }
        });
        const outOfStockCount = await Product.countDocuments({
            isDeleted: false,
            stock: 0
        });

        // Get categories for filter
        const categories = await Category.find({ isDeleted: false });

        res.render('adminInventory', {
            products,
            categories,
            totalProducts,
            lowStockCount,
            outOfStockCount,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
            stockStatus,
            categoryId,
            search,
            path:'/admin/inventory'
        });

    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).render('error', { message: 'Failed to load inventory' });
    }
};


module.exports = { getInventory }