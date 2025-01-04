const Category = require('../../models/Category');
const Product = require('../../models/Product');



const getCategoryProducts = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const page = parseInt(req.query.page) || 1; // Get page from query params
        const limit = 1; // Products per page
        const skip = (page - 1) * limit;
        
        const category = await Category.findById(categoryId);
        
        let parentCategory;
        let subcategories = [];
        let products = [];
        let totalProducts = 0;

        // If clicked category is a parent category
        if (!category.parent) {
            parentCategory = category;
            // Get all subcategories of this parent
            subcategories = await Category.find({
                parent: category._id,
                isDeleted: false,
                listed: true
            });
            
            // Get all products from parent and all its subcategories with pagination
            const categoryIds = [category._id, ...subcategories.map(sub => sub._id)];
            
            // Get total count for pagination
            totalProducts = await Product.countDocuments({
                category: { $in: categoryIds },
                isDeleted: false,
                listed: true
            });
            
            // Get paginated products
            products = await Product.find({
                category: { $in: categoryIds },
                isDeleted: false,
                listed: true
            })
            .skip(skip)
            .limit(limit);
        } 
        // If clicked category is a subcategory
        else {
            // Get parent category
            parentCategory = await Category.findById(category.parent);
            // Get all subcategories of the parent
            subcategories = await Category.find({
                parent: parentCategory._id,
                isDeleted: false,
                listed: true
            });
            
            // Get total count for pagination
            totalProducts = await Product.countDocuments({
                category: category._id,
                isDeleted: false,
                listed: true
            });
            
            // Get paginated products
            products = await Product.find({
                category: category._id,
                isDeleted: false,
                listed: true
            })
            .skip(skip)
            .limit(limit);
        }

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

        res.render('category', {
            category,          
            parentCategory,    
            subcategories,    
            products,
            parentCategories,
            pageTitle: category.name,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                hasNextPage: hasNextPage,
                hasPreviousPage: hasPreviousPage,
                nextPage: hasNextPage ? page + 1 : null,
                previousPage: hasPreviousPage ? page - 1 : null,
                limit: limit,
                totalProducts: totalProducts
            },
            user: req.session.user || null
        });

    } catch (error) {
        console.error('Category page error:', error);
        res.status(500).render('error', { message: 'Failed to load category page' });
    }
};

module.exports = { getCategoryProducts };


