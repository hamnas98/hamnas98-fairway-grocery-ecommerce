const Product = require('../../models/Product');
const Category = require('../../models/Category');
const StockHistory = require('../../models/StockHistory');
const excel = require('exceljs');

// Helper functions
const helpers = {
    getStockClass: (stock) => {
        if (stock === 0) return 'out';
        if (stock <= 10) return 'low';
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

// Main inventory page
const getInventory = async (req, res) => {
    try {
        // Get all active products with their categories
        const products = await Product.find({ isDeleted: false })
            .populate('category')
            .sort({ updatedAt: -1 });

        // Get counts for dashboard
        const lowStockCount = products.filter(p => p.stock <= 10).length;
        const outOfStockCount = products.filter(p => p.stock === 0).length;

        // Get all active categories
        const categories = await Category.find({ isDeleted: false });

        res.render('inventory', {
            products,
            categories,
            lowStockCount,
            outOfStockCount,
            totalProducts: products.length,
            getStockClass: helpers.getStockClass,
            getStockStatusClass: helpers.getStockStatusClass,
            getStockStatus: helpers.getStockStatus,
            path:'/admin/inventory'
        });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ success: false, message: 'Failed to load inventory' });
    }
};

// Get single product stock details
const getProductStock = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .select('name stock lowStockAlert');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Get product stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get product stock'
        });
    }
};

// Update product stock
const updateStock = async (req, res) => {
    try {
        const { productId, updateType, quantity, notes } = req.body;

        // Validate input
        if (!productId || !updateType || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Calculate new stock based on update type
        let newStock;
        const currentStock = parseInt(product.stock);
        const updateQuantity = parseInt(quantity);

        switch (updateType) {
            case 'add':
                newStock = currentStock + updateQuantity;
                break;
            case 'subtract':
                newStock = Math.max(0, currentStock - updateQuantity);
                break;
            case 'set':
                newStock = updateQuantity;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid update type'
                });
        }

        // Create stock history entry
        const stockHistory = new StockHistory({
            product: productId,
            updateType,
            quantity: updateQuantity,
            previousStock: currentStock,
            newStock,
            notes: notes || '',
            updatedBy: req.session.adminId // Assuming you have admin session
        });

        // Update product stock
        product.stock = newStock;

        // Save both product and history
        await Promise.all([
            product.save(),
            stockHistory.save()
        ]);

        res.json({
            success: true,
            message: 'Stock updated successfully',
            newStock
        });

    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update stock'
        });
    }
};

// Get stock history
const getStockHistory = async (req, res) => {
    try {
        const history = await StockHistory.find({ product: req.params.id })
            .populate('updatedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error('Get stock history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get stock history'
        });
    }
};

// Export inventory report


module.exports = {
    getInventory,
    getProductStock,
    updateStock,
    getStockHistory,
  
};