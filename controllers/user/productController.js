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
            pageTitle: product.name
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
        
        // Get new products
        const newProducts = await Product.find({
            isDeleted: false,
            listed: true
        })
        .sort({ createdAt: -1 })
        .limit(10);     
        // Get all parent categories for the header
        const parentCategories = await Category.find({ 
          parent: null,
          isDeleted: false,
          listed: true 
      });

                     

        res.render('newProducts', {
            newProducts,
            parentCategories,
            pageTitle: 'Fairway Supermarket'
        });



    } catch (error) {
        console.error('New Products error:', error);
        res.status(500).render('error', { message: 'Failed to load New Products page' });
    }
};

const getBestvalueProducts = async (req, res) => {
    try {
            const bestValueProducts = await Product.find({
            isDeleted: false,
            listed: true,
            discountPercentage: { $gt: 0 }  // Only get products with discount
        })
        .sort({ discountPercentage: -1 })  // Sort by highest discount first
        .limit(10);
        
        // Get all parent categories for the header
        const parentCategories = await Category.find({ 
          parent: null,
          isDeleted: false,
          listed: true 
      });
        res.render('bestValueProducts', {
            bestValueProducts,
            parentCategories,
            pageTitle: 'Fairway Supermarket'
        });

    } catch (error) {
        console.error('Best Value Products error:', error);
        res.status(500).render('error', { message: 'Failed to load Best Value Products' });
    }
};
module.exports = { getProductDetails, getNewProducts, getBestvalueProducts };