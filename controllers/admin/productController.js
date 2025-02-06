const Product = require('../../models/Product');
const Category = require('../../models/Category');
const fs = require('fs').promises;
const path = require('path');
const { deleteFile } = require('../../utils/fileHelper');

const getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 2;
        const searchQuery = req.query.search || '';
        const categoryId = req.query.category || '';
        const listed = req.query.listed || '';

        let query = { isDeleted: false };

        if (searchQuery) {
            query.name = { $regex: searchQuery, $options: 'i' };
        }

        if (categoryId) {
            query.category = categoryId;
        }

        if (listed) {
            query.listed = listed === 'true';
        }

        const total = await Product.countDocuments(query);

        const products = await Product.find(query)
            .populate('category', 'name hasBrands')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const categories = await Category.find({ 
            isDeleted: false, 
            listed: true 
        });

        res.render('products', {
            admin: req.session.admin,
            products,
            categories,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                total
            },
            filters: {
                search: searchQuery,
                category: categoryId,
                listed
            },
            path: '/admin/products'
        });
    } catch (error) {
        console.error('Get products error:', error);
        req.flash('error', 'Error fetching products');
        res.redirect('/admin/dashboard');
    }
};
const getAddProduct = async (req, res) => {
    try {
        // Get all categories
        const categories = await Category.find({ isDeleted: false })
                                      .populate('parent')
                                      .sort('name');

        // Create category hierarchy
        const categoryStructure = categories.reduce((acc, cat) => {
            if (!cat.parent) {
                // Parent category
                acc[cat._id] = { 
                    parent: cat, 
                    categories: [] 
                };
            } else if (acc[cat.parent._id]) {
                // Subcategory with a valid parent
                acc[cat.parent._id].categories.push(cat);
            }
            return acc;
        }, {});

  
        res.render('addProduct', {  
            admin: req.session.admin,
            categoryStructure, 
            path: '/admin/products/add'
        });
    } catch (error) {
        console.error('Add product page error:', error);
        req.flash('error', 'Error loading add product page');
        res.redirect('/admin/products');
    }
};

const getParentCategory = async (req, res) => {
    try {
        const categories = await Category.find({ 
            parent: req.params.parentId,
            isDeleted: false,
            listed: true 
        }).sort('name');

        res.json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Get subcategories error:', error);
        res.json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
};

const addProduct = async (req, res) => {
    try {
        const {
            name, brand, category, parentCategory, price,
            discountPrice, discountType, discountPercentage,
            stock, unit, quantity, highlights,
            aboutProduct, listed
        } = req.body;
        // Validate required fields
        if (!name || !category || !price || !stock || !unit || !quantity || !aboutProduct || !parentCategory) {
            return res.json({
                success: false,
                message: 'Please fill all required fields'
            });
        }
         // Validate price
         if (price<=0) {
            return res.json({
                success: false,
                message: 'Please enter valid price'
            });
        }

        // Validate images
        if (!req.files || req.files.length < 3) {
            return res.json({
                success: false,
                message: 'Please upload at least 3 product images'
            });
        }

        if (req.files.length > 5) {
            return res.json({
                success: false,
                message: 'Maximum 5 images allowed'
            });
        }

        // Calculate discounts based on type
        let finalDiscountPrice = null;
        let finalDiscountPercentage = 0;


        if (discountType === 'price' && discountPrice) {
            finalDiscountPrice = parseFloat(discountPrice);
            finalDiscountPercentage = Math.round(((parseFloat(price) - finalDiscountPrice) / parseFloat(price)) * 100);
        } else if (discountType === 'percentage' && discountPercentage) {
            finalDiscountPercentage = parseFloat(discountPercentage);
            finalDiscountPrice = parseFloat(price) - (parseFloat(price) * (finalDiscountPercentage / 100));
        }

        // Process images
        const images = req.files.map(file => `/uploads/products/${file.filename}`);

        // Create new product
        const product = new Product({
            name,
            brand: brand || undefined,
            category,
            parentCategory,
            price: parseInt(price),
            discountPrice: finalDiscountPrice,
            discountPercentage: finalDiscountPercentage,
            stock: parseInt(stock),
            unit,
            quantity: parseFloat(quantity),
            highlights: highlights ? 
                (Array.isArray(highlights) ? highlights : highlights.split('\n').filter(h => h.trim())) 
                : [],
            aboutProduct: aboutProduct ? 
                (Array.isArray(aboutProduct) ? aboutProduct : aboutProduct.split('\n').filter(a => a.trim())) 
                : [],
            images,
            listed: listed === 'true',
            outOfStock: parseInt(stock) <= 0
        });



        await product.save();

        res.json({
            success: true,
            message: 'Product added successfully',
            redirectUrl: '/admin/products'
        });
    } catch (error) {
        console.error('Add product error:', error);
        res.json({
            success: false,
            message: error.message || 'Error adding product'
        });
    }
};

const getEditProduct = async (req, res) => {
    try {
        const product = await Product.findOne({ 
            _id: req.params.id,
            isDeleted: false 
        }).populate({
            path: 'category',
            populate: { path: 'parent' }
        });

        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/admin/products');
        }

        // Get categories for dropdown
        const categories = await Category.find({ 
            isDeleted: false,
            listed: true
        }).populate('parent').sort('name');

        // Create category hierarchy with sorted subcategories
        const categoryStructure = categories.reduce((acc, cat) => {
            if (!cat.parent) {
                // Initialize parent category if not exists
                if (!acc[cat._id]) {
                    acc[cat._id] = { parent: cat, categories: [] };
                } else {
                    acc[cat._id].parent = cat;
                }
            } else {
                // Add to parent's categories array
                if (!acc[cat.parent._id]) {
                    acc[cat.parent._id] = { parent: cat.parent, categories: [cat] };
                } else {
                    acc[cat.parent._id].categories.push(cat);
                }
                // Sort subcategories by name
                acc[cat.parent._id].categories.sort((a, b) => a.name.localeCompare(b.name));
            }
            return acc;
        }, {});

        res.render('editProduct', {
            product,
            categoryStructure,
            admin: req.session.admin,
            path: '/admin/products/edit'
        });
    } catch (error) {
        console.error('Edit product page error:', error);
        req.flash('error', 'Error loading product');
        res.redirect('/admin/products');
    }
};

const updateProduct = async (req, res) => {
    try {
        const {
            name, brand, category, parentCategory, price,
            discountPrice, discountType, discountPercentage,
            stock, unit, quantity, highlights,
            aboutProduct, listed
        } = req.body;

        // Get the existing product
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.json({
                success: false,
                message: 'Product not found'
            });
        }

        // Calculate final discount values
        let finalDiscountPrice = null;
        let finalDiscountPercentage = 0;

        if (discountType === 'price' && discountPrice) {
            finalDiscountPrice = parseFloat(discountPrice);
            finalDiscountPercentage = Math.round(((parseFloat(price) - finalDiscountPrice) / parseFloat(price)) * 100);
        } else if (discountType === 'percentage' && discountPercentage) {
            finalDiscountPercentage = parseFloat(discountPercentage);
            finalDiscountPrice = parseFloat(price) - (parseFloat(price) * (finalDiscountPercentage / 100));
        }

        let updatedImages = [...product.images];
      
        if (req.body.removedImages) {
            const removedIndices = JSON.parse(req.body.removedImages);
            
            // Delete files
            for (const index of removedIndices) {
                const imagePath = product.images[index];
                if (imagePath) {
                    await deleteFile(imagePath);
                }
            }
            
            // Update images array
            updatedImages = updatedImages.filter((_, index) => !removedIndices.includes(index));
        }
        

        // Add new images
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
            updatedImages = [...updatedImages, ...newImages];
        }


        // Prepare update data
        const updateData = {
            name,
            brand: brand || undefined,
            category,
            parentCategory,
            price: parseInt(price),
            discountPrice: finalDiscountPrice,
            discountPercentage: finalDiscountPercentage,
            stock: parseInt(stock),
            unit,
            quantity: parseFloat(quantity),
            highlights: highlights || [],
            aboutProduct: aboutProduct || [],
            listed: listed === 'true',
            outOfStock: parseInt(stock) <= 0,
            images: updatedImages
        };

        // Update product with all changes
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedProduct) {
            return res.json({
                success: false,
                message: 'Failed to update product'
            });
        }

        res.json({
            success: true,
            message: 'Product updated successfully',
            redirectUrl: '/admin/products'
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.json({
            success: false,
            message: error.message || 'Error updating product'
        });
    }
};

const listingProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.json({
                success: false,
                message: 'Product not found'
            });
        }

        // Toggle the listed status
        product.listed = !product.listed;
        await product.save();

        res.json({
            success: true,
            message: `Product ${product.listed ? 'listed' : 'unlisted'} successfully`
        });
    } catch (error) {
        console.error('Toggle Product status error:', error);
        res.json({
            success: false,
            message: 'Error updating product status'
        });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.json({
                success: false,
                message: 'Product not found'
            });
        }

        // Soft delete
        product.isDeleted = true;
        await product.save();

        res.json({
            success: true,
            message: 'Product removed successfully'
        });
    } catch (error) {
        console.error('Delete Product error:', error);
        res.json({
            success: false,
            message: 'Error removing Product'
        });
    }
};

// View Product Details
const getProductDetails = async (req, res) => {
    try {
        // Find product and populate category with parent
        const product = await Product.findOne({
            _id: req.params.id,
            isDeleted: false
        }).populate({
            path: 'category',
            populate: {
                path: 'parent'
            }
        });
 
        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/admin/products');
        }
 
        // Format dates
        const createdDate = new Date(product.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
 
      
 
        res.render('viewProduct', {
            product,
            admin: req.session.admin,
            createdDate,
            path: '/admin/products/view',
            // Add any stats/analytics you want to show
            stats: {
                totalOrders: 0, // Replace with actual order count
                totalSales: 0,  // Replace with actual sales data
                lastOrdered: null // Replace with last order date
            }
        });
 
    } catch (error) {
        console.error('Get product details error:', error);
        req.flash('error', 'Error loading product details');
        res.redirect('/admin/products');
    }
 };
 

module.exports = { getAllProducts, getAddProduct, getParentCategory, addProduct,
     getEditProduct, updateProduct, listingProduct, deleteProduct, getProductDetails };