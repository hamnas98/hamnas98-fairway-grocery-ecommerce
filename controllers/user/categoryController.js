const Category = require('../../models/Category');
const Product = require('../../models/Product');

// Controller (shopController.js)

const getCategoryProducts = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);
        
        let parentCategory;
        let subcategories = [];
        let products = [];

        // If clicked category is a parent category
        if (!category.parent) {
            parentCategory = category;
            // Get all subcategories of this parent
            subcategories = await Category.find({
                parent: category._id,
                isDeleted: false,
                listed: true
            });
            
            // Get all products from parent and all its subcategories
            const categoryIds = [category._id, ...subcategories.map(sub => sub._id)];
            products = await Product.find({
                category: { $in: categoryIds },
                isDeleted: false,
                listed: true
            });
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
            // Get products only from this subcategory
            products = await Product.find({
                category: category._id,
                isDeleted: false,
                listed: true
            });
        }
          // Get all parent categories for the header
          const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        });

        res.render('category', {
            category,          // Current category (parent or sub)
            parentCategory,    // Parent category
            subcategories,     // List of subcategories
            products,
            parentCategories,
            pageTitle: category.name
        });

    } catch (error) {
        console.error('Category page error:', error);
        res.status(500).render('error', { message: 'Failed to load category page' });
    }
};
module.exports = {
    getCategoryProducts
};


