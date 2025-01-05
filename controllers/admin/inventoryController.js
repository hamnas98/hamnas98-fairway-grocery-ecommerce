const Product = require('../../models/Product');
const Category = require('../../models/Category');
const StockHistory = require('../../models/StockHistory');
const excel = require('exceljs');
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

        let newStock;
        const currentStock = parseInt(product.stock);
        const updateQuantity = parseInt(quantity);

        switch (updateType) {
            case 'add':
                newStock = currentStock + updateQuantity;
                break;
            case 'subtract': // Changed from 'remove' to 'subtract' to match schema
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
            newStock: newStock,
            notes: notes || '',
            updatedBy: req.session.admin.id
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
            newStock,
            product: {
                id: product._id,
                name: product.name,
                stock: newStock
            }
        });

    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update stock. Please try again.'
        });
    }
};
//

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
        const { updateType, updates, notes } = req.body;

        const updatePromises = updates.map(async ({ productId, quantity }) => {
            const product = await Product.findById(productId);
            if (!product) return null;

            const currentStock = parseInt(product.stock);
            const updateQuantity = parseInt(quantity);
            let newStock;

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
                    throw new Error('Invalid update type');
            }

            // Create stock history
            const stockHistory = new StockHistory({
                product: productId,
                updateType,
                quantity: updateQuantity,
                previousStock: currentStock,
                newStock,
                notes,
                updatedBy: req.session.admin.id
            });

            product.stock = newStock;

            return Promise.all([
                product.save(),
                stockHistory.save()
            ]);
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

function getStockStatus(stock, lowStockThreshold = 10) {
    if (stock === 0) return 'Out of Stock';
    if (stock <= lowStockThreshold) return 'Low Stock';
    return 'In Stock';
}

const exportInventory = async (req, res) => {
    try {
        const products = await Product.find({ isDeleted: false })
            .populate('category')
            .select('name sku category stock lowStockAlert updatedAt');

        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Inventory');

        // Define columns
        worksheet.columns = [
            { header: 'Product Name', key: 'name', width: 30 },
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Current Stock', key: 'stock', width: 15 },
            { header: 'Low Stock Alert', key: 'lowStockAlert', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Last Updated', key: 'updatedAt', width: 20 }
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE8EAED' }
        };

        // Add products data
        products.forEach(product => {
            const status = getStockStatus(product.stock);
            worksheet.addRow({
                name: product.name,
                sku: product.sku || '-',
                category: product.category.name,
                stock: product.stock,
                lowStockAlert: product.lowStockAlert || '-',
                status: status,
                updatedAt: product.updatedAt.toLocaleDateString()
            });
        });

        // Add style to status column based on value
        worksheet.getColumn('status').eachCell((cell, rowNumber) => {
            if (rowNumber > 1) { // Skip header
                switch(cell.value) {
                    case 'Out of Stock':
                        cell.font = { color: { argb: 'FFFF0000' } }; // Red
                        break;
                    case 'Low Stock':
                        cell.font = { color: { argb: 'FFFF9900' } }; // Orange
                        break;
                    case 'In Stock':
                        cell.font = { color: { argb: 'FF008000' } }; // Green
                        break;
                }
            }
        });

        // Format all borders
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Set content type and headers
        res.setHeader(
            'Content-Type', 
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition', 
            'attachment; filename=inventory-report.xlsx'
        );

        // Write to response
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