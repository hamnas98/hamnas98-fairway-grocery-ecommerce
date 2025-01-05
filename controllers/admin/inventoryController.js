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

const updateStock = async (req, res) => {
    try {
        const { productId, updateType, quantity, notes } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        let newStock;
        switch (updateType) {
            case 'add':
                newStock = product.stock + parseInt(quantity);
                break;
            case 'remove':
                newStock = Math.max(0, product.stock - parseInt(quantity));
                break;
            case 'set':
                newStock = parseInt(quantity);
                break;
            default:
                throw new Error('Invalid update type');
        }

        // Create stock history entry
        const stockHistory = new StockHistory({
            product: productId,
            updateType,
            previousStock: product.stock,
            updatedStock: newStock,
            quantity: parseInt(quantity),
            notes,
            updatedBy: req.session.admin.id
        });

        // Update product stock
        product.stock = newStock;

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

const bulkUpdateStock = async (req, res) => {
    try {
        const { updates } = req.body;
        
        const updatePromises = updates.map(async update => {
            const product = await Product.findById(update.productId);
            if (!product) return null;

            const stockHistory = new StockHistory({
                product: update.productId,
                updateType: 'set',
                previousStock: product.stock,
                updatedStock: update.quantity,
                quantity: update.quantity,
                notes: 'Bulk update',
                updatedBy: req.session.admin.id
            });

            product.stock = update.quantity;

            await Promise.all([
                product.save(),
                stockHistory.save()
            ]);

            return product;
        });

        await Promise.all(updatePromises);

        res.json({
            success: true,
            message: 'Bulk update completed successfully'
        });
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update stock'
        });
    }
};

const exportInventory = async (req, res) => {
    try {
        const products = await Product.find({ isDeleted: false })
            .populate('category')
            .select('name sku category stock lowStockAlert updatedAt');

        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Inventory');

        worksheet.columns = [
            { header: 'Product Name', key: 'name', width: 30 },
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Current Stock', key: 'stock', width: 15 },
            { header: 'Low Stock Alert', key: 'lowStockAlert', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Last Updated', key: 'updatedAt', width: 20 }
        ];

        products.forEach(product => {
            worksheet.addRow({
                name: product.name,
                sku: product.sku || '-',
                category: product.category.name,
                stock: product.stock,
                lowStockAlert: product.lowStockAlert,
                status: getStockStatus(product.stock),
                updatedAt: product.updatedAt.toLocaleDateString()
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export inventory'
        });
    }
};

const setStockAlert = async (req, res) => {
    try {
        const { productId, alertLevel } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        product.lowStockAlert = alertLevel;
        await product.save();

        res.json({
            success: true,
            message: 'Stock alert level updated successfully'
        });
    } catch (error) {
        console.error('Set stock alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set stock alert'
        });
    }
};


module.exports = { getInventory, getProductStock, updateStock, getStockHistory, bulkUpdateStock, exportInventory, setStockAlert }