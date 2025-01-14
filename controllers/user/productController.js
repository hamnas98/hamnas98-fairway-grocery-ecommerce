const Category = require('../../models/Category');
const Product = require('../../models/Product');

const getProductDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Get product details with populated category
        const product = await Product.findById(productId)
            .populate('category')
            .populate({
                path: 'category',
                populate: {
                    path: 'parent',
                    model: 'Category'
                }
            });

        if (!product) {
            return res.status(404).render('404');
        }

        // Get parent categories for header
        const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        });

        // Get related products from same category
        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: product._id }, // Exclude current product
            isDeleted: false,
            listed: true
        }).limit(10);

        res.render('productDetails', {
            product,
            relatedProducts,
            parentCategories,
            pageTitle: product.name,
            user: req.session.user || null,

        });

    } catch (error) {
        console.error('Product details error:', error);
        res.status(500).render('error', {
            message: 'Failed to load product details'
        });
    }
};
const getNewProducts = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 1; // Products per page
        const skip = (page - 1) * limit;
        
        // Get total count for pagination
        const totalProducts = await Product.countDocuments({
            isDeleted: false,
            listed: true
        });
        
        // Get paginated new products
        const newProducts = await Product.find({
            isDeleted: false,
            listed: true
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        // Get all parent categories for the header
        const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        });

        // Calculate pagination values
        const totalPages = Math.ceil(totalProducts / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        res.render('newProducts', {
            newProducts,
            parentCategories,
            pageTitle: 'New Products - Fairway Supermarket',
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                hasNextPage: hasNextPage,
                hasPreviousPage: hasPreviousPage,
                nextPage: hasNextPage ? page + 1 : null,
                previousPage: hasPreviousPage ? page - 1 : null,
                limit: limit,
                totalProducts: totalProducts,
            },
            user: req.session.user || null
        });

    } catch (error) {
        console.error('New Products error:', error);
        res.status(500).render('error', { message: 'Failed to load New Products page' });
    }
};

const getBestvalueProducts = async (req, res) => {

    try {


        const page = parseInt(req.query.page) || 1;
        const limit = 1; // Products per page
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalProducts = await Product.countDocuments({
            isDeleted: false,
            listed: true,
            discountPercentage: { $gt: 0 }
        });

        // Get paginated best value products
        const bestValueProducts = await Product.find({
            isDeleted: false,
            listed: true,
            discountPercentage: { $gt: 0 }
        })
        .sort({ discountPercentage: -1 })
        .skip(skip)
        .limit(limit);

        // Get all parent categories for the header
        const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        });

        // Calculate pagination values
        const totalPages = Math.ceil(totalProducts / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        res.render('bestValueProducts', {
            bestValueProducts,
            parentCategories,
            pageTitle: 'Best Value Products - Fairway Supermarket',
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                hasNextPage: hasNextPage,
                hasPreviousPage: hasPreviousPage,
                nextPage: hasNextPage ? page + 1 : null,
                previousPage: hasPreviousPage ? page - 1 : null,
                limit: limit,
                totalProducts: totalProducts,
            },
            user: req.session.user || null
        });

    } catch (error) {
        console.error('Best Value Products error:', error);
        res.status(500).render('error', { message: 'Failed to load Best Value Products' });
    }
};
module.exports = { getProductDetails, getNewProducts, getBestvalueProducts };