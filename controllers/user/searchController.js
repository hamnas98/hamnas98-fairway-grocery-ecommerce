// controllers/searchController.js
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const SearchHistory = require('../../models/SearchHistory');


// Quick search for dropdown
const quickSearch = async (req, res) => {
    try {
        const query = req.query.query || ''

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
        const query = req.query.q || '';
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const sort = req.query.sort || 'featured';
        const showOutOfStock = req.query.outOfStock === 'true';
        const categories = req.query.categories ? req.query.categories.split(',') : [];
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || Infinity;
        const limit = 2; // Items per page
        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ],
            isDeleted: false,
            listed: true,
            price: { $gte: minPrice }
        };

        if (maxPrice !== Infinity) {
            searchQuery.price.$lte = maxPrice;
        }

        // Add category filter
        if (categories.length > 0) {
            searchQuery.category = { $in: categories };
        }

        // Add stock filter
        if (!showOutOfStock) {
            searchQuery.stock = { $gt: 0 };
        }

        // Define sort options
        const sortOptions = {
            featured: { featured: -1 },
            popularity: { soldCount: -1 },
            priceLow: { discountPrice: 1, price: 1 },
            priceHigh: { discountPrice: -1, price: -1 },
            rating: { averageRating: -1 },
            newest: { createdAt: -1 },
            nameAsc: { name: 1 },
            nameDesc: { name: -1 }
        };

        // Execute queries in parallel
        const [products, totalProducts, allCategories] = await Promise.all([
            // Get products
            Product.find(searchQuery)
                .populate('category')
                .sort(sortOptions[sort] || sortOptions.featured)
                .skip(skip)
                .limit(limit),

            // Get total count
            Product.countDocuments(searchQuery),

            // Get all categories for filter
            Category.find({ 
                parent: { $ne: null },
                isDeleted: false, 
                listed: true 
            }).select('name')
        ]);

        // Calculate pagination data
        const totalPages = Math.ceil(totalProducts / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // Calculate pagination range
        let startPage = Math.max(1, page - 2);
        let endPage = Math.min(totalPages, page + 2);

        // Adjust range if at edges
        if (startPage <= 3) {
            endPage = Math.min(5, totalPages);
        }
        if (endPage >= totalPages - 2) {
            startPage = Math.max(1, totalPages - 4);
        }

        // Save search to history if user is logged in and has a query
        if (req.session.user && query) {
            try {
                await SearchHistory.addSearch(req.session.user.id, query);
            } catch (error) {
                console.error('Failed to save search history:', error);
            }
        }

        // Calculate category counts for display
        const categoryCountMap = new Map();
        if (products.length > 0) {
            const categoryCounts = await Product.aggregate([
                { $match: searchQuery },
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ]);
            categoryCounts.forEach(item => categoryCountMap.set(item._id.toString(), item.count));
        }

        // Render the search page
        res.render('search', {
            parentCategories,
            query,
            products,
            totalProducts,
            currentPage: page,
            totalPages,
            hasNextPage,
            hasPrevPage,
            startPage,
            endPage,
            currentSort: sort,
            showOutOfStock,
            categories: allCategories,
            selectedCategories: categories,
            categoryCountMap,
            minPrice,
            maxPrice,
            limit,
            pageTitle: `Search Results for "${query}"`,
            user: req.session.user || null,
            path: '/search',
            // Add price range stats
            priceStats: {
                min: products.length ? Math.min(...products.map(p => p.discountPrice || p.price)) : 0,
                max: products.length ? Math.max(...products.map(p => p.discountPrice || p.price)) : 0
            }
        });

    } catch (error) {
        console.error('Search page error:', error);
        res.status(500).render('error', { 
            message: 'Failed to load search results',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};


const SaveSearchHistory = async (userId, query) => {
    try {
        await SearchHistory.addSearch(userId, query);
    } catch (error) {
        console.error('Failed to save search history:', error);
    }
};

// Update the saveSearchHistory function
const saveSearchHistory = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const { query } = req.body;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Invalid query'
            });
        }

        await SearchHistory.addSearch(req.session.user.id, query.trim());

        res.json({
            success: true,
            message: 'Search history saved'
        });

    } catch (error) {
        console.error('Save search history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save search history'
        });
    }
};
const getSearchHistory = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.json({ success: true, history: [] });
        }
        
        const history = await SearchHistory.find({ userId: req.session.user.id })
            .sort({ timestamp: -1 })
            .limit(5)
            .select('query timestamp');

        res.json({ success: true, history });
    } catch (error) {
        console.error('Search history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch search history'
        });
    }
};
const deleteSearchHistory = async (req, res) => {
    try {
        const { itemId } = req.params;
        console.log(itemId,'iid')
        
        // Ensure user can only delete their own history
        await SearchHistory.findOneAndDelete({
            _id: itemId,
            userId: req.session.user.id
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
    deleteSearchHistory,
    saveSearchHistory
};