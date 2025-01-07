const Product = require('../../models/Product');
const Category = require('../../models/Category');


const searchProducts = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.json({
                success: true,
                products: []
            });
        }

        // Create search query
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
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
};
const getSearchPage = async (req, res) => {
    try {
        const query = req.query.q || '';
        const page = parseInt(req.query.page) || 1;
        const sort = req.query.sort || 'featured';
        const showOutOfStock = req.query.outOfStock === 'true';
        const limit = 12;
        const skip = (page - 1) * limit;

        // Base search query
        let searchQuery = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ],
            isDeleted: false,
            listed: true
        };

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

        // Get products with filters and sort
        const products = await Product.find(searchQuery)
            .populate('category')
            .sort(sortOptions[sort] || sortOptions.featured)
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const totalProducts = await Product.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalProducts / limit);

        const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        }).select('name image');

        res.render('search', {
            query,
            products,
            currentPage: page,
            totalPages,
            totalProducts,
            currentSort: sort,
            pageTitle: `Search Results for "${query}"`,
            showOutOfStock,
            parentCategories
        });

    } catch (error) {
        console.error('Search page error:', error);
        res.status(500).render('error', { 
            message: 'Failed to load search results'
        });
    }
};

module.exports = { searchProducts, getSearchPage };