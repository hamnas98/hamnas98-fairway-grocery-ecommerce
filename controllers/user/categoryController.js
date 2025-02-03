const Category = require('../../models/Category');
const Product = require('../../models/Product');


const getCategoryProducts = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const sort = req.query.sort || 'popularity'; // Get sort parameter
        const limit = 2; // Products per page
        const skip = (page - 1) * limit;
        
        const category = await Category.findById(categoryId);
        
        let parentCategory;
        let subcategories = [];
        let products = [];
        let totalProducts = 0;

        // Define sort options
        const sortOptions = {
            popularity: { soldCount: -1 },
            priceLow: { discountPrice: 1, price: 1 },
            priceHigh: { discountPrice: -1, price: -1 },
            nameAsc: { name: 1 },
            nameDesc: { name: -1 },
            discount: { discountPercentage: -1 },
            newest: { createdAt: -1 }
        };

        // Build base query
        let baseQuery = {
            isDeleted: false,
            listed: true
        };

        // If clicked category is a parent category
        if (!category.parent) {
            parentCategory = category;
            subcategories = await Category.find({
                parent: category._id,
                isDeleted: false,
                listed: true
            });
            
            const categoryIds = [category._id, ...subcategories.map(sub => sub._id)];
            baseQuery.category = { $in: categoryIds };
        } else {
            parentCategory = await Category.findById(category.parent);
            subcategories = await Category.find({
                parent: parentCategory._id,
                isDeleted: false,
                listed: true
            });
            
            baseQuery.category = category._id;
        }

        // Execute queries with sorting
        const [productResults, countResult, parentCategories] = await Promise.all([
            Product.find(baseQuery)
                .sort(sortOptions[sort] || sortOptions.popularity)
                .skip(skip)
                .limit(limit),
            
            Product.countDocuments(baseQuery),
            
            Category.find({ 
                parent: null,
                isDeleted: false,
                listed: true 
            })
        ]);

        products = productResults;
        totalProducts = countResult;

        // Calculate pagination
        const totalPages = Math.ceil(totalProducts / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        // Format pagination parameters to include sort
        const paginationParams = new URLSearchParams();
        if (sort !== 'popularity') paginationParams.set('sort', sort);

        res.render('category', {
            category,          
            parentCategory,    
            subcategories,    
            products,
            parentCategories,
            currentSort: sort,
            pageTitle: category.name,
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage,
                hasPreviousPage,
                nextPage: hasNextPage ? page + 1 : null,
                previousPage: hasPreviousPage ? page - 1 : null,
                limit,
                totalProducts,
                urlParams: paginationParams.toString()
            },
            user: req.session.user || null,
        });

    } catch (error) {
        console.error('Category page error:', error);
        res.status(500).render('error', { message: 'Failed to load category page' });
    }
};


module.exports = { getCategoryProducts };


