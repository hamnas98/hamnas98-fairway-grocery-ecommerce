// controllers/searchController.js
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const SearchHistory = require('../../models/SearchHistory');
const sanitize = require('sanitize-html');

// Quick search for dropdown
const quickSearch = async (req, res) => {
    try {
        const query = sanitize(req.query.query || '');

        if (!query) {
            return res.json({ success: true, products: [] });
        }

        const searchQuery = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ],
            isDeleted: false,
            listed: true,
            stock: { $gt: 0 }
        };

        const products = await Product.find(searchQuery)
            .populate('category')
            .select('name images price discountPrice category stock')
            .limit(8);

        res.json({
            success: true,
            products: products.map(product => ({
                id: product._id,
                name: product.name,
                image: product.images[0],
                category: product.category.name,
                price: product.discountPrice || product.price
            }))
        });

    } catch (error) {
        console.error('Quick search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
};

// Main search page
const getSearchPage = async (req, res) => {
    try {
        // Get all parent categories for the header
        const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        });
        // Get and sanitize query parameters
        const query = sanitize(req.query.q || '');
        const page = parseInt(req.query.page) || 1;
        const sort = req.query.sort || 'featured';
        const showOutOfStock = req.query.outOfStock === 'true';
        const categories = req.query.categories ? req.query.categories.split(',') : [];
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || Infinity;
        const limit = 12;
        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ],
            isDeleted: false,
            listed: true,
            price: { $gte: minPrice, $lte: maxPrice }
        };

        // Add category filter
        if (categories.length > 0) {
            searchQuery.category = { $in: categories };
        }

        // Add stock filter
        if (!showOutOfStock) {
            searchQuery.stock = { $gt: 0 };
        }

        // Sort options
        const sortOptions = {
            featured: { featured: -1 },
            popularity: { soldCount: -1 },
            priceLow: { price: 1 },
            priceHigh: { price: -1 },
            rating: { averageRating: -1 },
            newest: { createdAt: -1 },
            nameAsc: { name: 1 },
            nameDesc: { name: -1 }
        };

        // Get products
        const products = await Product.find(searchQuery)
            .populate('category')
            .sort(sortOptions[sort] || sortOptions.featured)
            .skip(skip)
            .limit(limit);

        // Get total count
        const totalProducts = await Product.countDocuments(searchQuery);
        const hasMoreProducts = totalProducts > skip + products.length;

        // Get all categories for filter
        const allCategories = await Category.find({ 
            isDeleted: false, 
            listed: true 
        }).select('name');

        // Save search history if user is logged in
        if (req.user && query) {
            await SaveSearchHistory(req.user._id, query);
        }

        res.render('search', {
            parentCategories,
            query,
            products,
            currentPage: page,
            totalProducts,
            hasMoreProducts,
            currentSort: sort,
            showOutOfStock,
            categories: allCategories,
            selectedCategories: categories,
            minPrice,
            maxPrice,
            pageTitle: `Search Results for "${query}"`,
            user:req.session.user || null
        });

    } catch (error) {
        console.error('Search page error:', error);
        res.status(500).render('error', { 
            message: 'Failed to load search results'
        });
    }
};

// Save search history
const SaveSearchHistory = async (userId, query) => {
    try {
        await SearchHistory.create({ userId, query });
        await SearchHistory.limitHistorySize(userId);
    } catch (error) {
        console.error('Failed to save search history:', error);
    }
};

// Get search history
const getSearchHistory = async (req, res) => {
    try {
        if (!req.user) {
            return res.json({ success: true, history: [] });
        }

        const history = await SearchHistory.find({ userId: req.user._id })
            .sort({ timestamp: -1 })
            .limit(10);

        res.json({ success: true, history });
    } catch (error) {
        console.error('Failed to get search history:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load search history' 
        });
    }
};

const deleteSearchHistory = async (req, res) => {
    try {
        const { itemId } = req.params;
        
        // Ensure user can only delete their own history
        await SearchHistory.findOneAndDelete({
            _id: itemId,
            userId: req.user._id
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete search history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete search history'
        });
    }
};

module.exports = {
    quickSearch,
    getSearchPage,
    getSearchHistory,
    deleteSearchHistory
};