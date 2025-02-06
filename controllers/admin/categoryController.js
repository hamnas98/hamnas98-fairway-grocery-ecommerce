const Category = require('../../models/Category');
const fs = require('fs').promises;
const path = require('path');
const { deleteFile } = require('../../utils/fileHelper');

const getAllCategories =  async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 4;
        const searchQuery = req.query.search || '';
        const parentId = req.query.parent || '';
        const listingStatus = req.query.listed || '';

        // predefined query
        let query = { isDeleted: false };

        if (searchQuery) {
            query.name = { $regex: searchQuery, $options: 'i' };
        }

        if (parentId) {
            query.parent = parentId;
        }

        if (listingStatus) {
            query.listed = listingStatus === 'true';
        }

        const total = await Category.countDocuments(query);

        const categories = await Category.find(query)
            .populate('parent', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // getting parent categories for filter
        const parentCategories = await Category.find({ 
            isDeleted: false, 
            parent: null 
        });

        res.render('categories', {
            admin: req.session.admin,
            categories,
            parentCategories,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                total
            },
            filters: {
                search: searchQuery,
                parent: parentId,
                listed: listingStatus
            },
            path: '/admin/categories'
        });

    } catch (error) {
        console.error('Get categories error:', error);
        req.flash('error', 'Error fetching categories');
        res.redirect('/admin/dashboard');
    }
};

const getAddCategory = async (req, res) => {
    try {
        //  parent categories for dropdown
        const parentCategories = await Category.find({ 
            isDeleted: false, 
            parent: null 
        });
        
        res.render('addCategory', {
            admin: req.session.admin,
            parentCategories,
            path: '/admin/categories/add'
        });
    } catch (error) {
        console.error('Add category page error:', error);
        req.flash('error', 'Error loading add category page');
        res.redirect('/admin/categories');
    }
};

const addCategory = async (req, res) => {
    try {
        const { name, parent, discount, listed } = req.body;
        let image = null;

        //  image upload
        if (req.file) {
            image = `/uploads/categories/${req.file.filename}`;
        }

        // checking category name already exists
        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            isDeleted: false 
        });

        if (existingCategory) {
            return res.json({
                success: false,
                message: 'Category name already exists'
            });
        }

        const newCategory = new Category({
            name,
            parent: parent || null,
            discount: discount || 0,
            image,
            listed: listed === 'true',
            isDeleted: false
        });

        await newCategory.save();

        res.json({
            success: true,
            message: 'Category added successfully',
            redirectUrl: '/admin/categories'
        });
    } catch (error) {
        console.error('Add category error:', error);
        res.json({
            success: false,
            message: 'Error adding category'
        });
    }
};

const getEditCategory = async (req, res) => {
    try {
        // finfing category details
        const category = await Category.findOne({ 
            _id: req.params.id,
            isDeleted: false 
        });

        if (!category) {
            req.flash('error', 'Category not found');
            return res.redirect('/admin/categories');
        }

        // Get parent categories excluding current category and its children
        const parentCategories = await Category.find({ 
            isDeleted: false,
            parent: null,
            _id: { $ne: category._id }
        }).sort('name');
        
        res.render('editCategory', {
            admin: req.session.admin,
            category,
            parentCategories,
            path: '/admin/categories/edit'
        });
    } catch (error) {
        console.error('Edit category error:', error);
        req.flash('error', 'Error loading category');
        res.redirect('/admin/categories');
    }
};

const updateCategory = async (req, res) => {
    try {
        const { name, parent, discount, listed } = req.body;
        const categoryId = req.params.id;

        // Check if category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if name exists without current category
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            _id: { $ne: categoryId },
            isDeleted: false
        });

        if (existingCategory) {
            return res.json({
                success: false,
                message: 'Category name already exists'
            });
        }


        // Update data object
        const updateData = {
            name,
            parent: parent || null,
            discount: discount || 0,
            listed: listed === 'true'
        };

        //  image upload if new image is selected
       if (req.file) {
            // Delete old image if exists
            if (category.image) {
                await deleteFile(category.image);
            }
            updateData.image = `/uploads/categories/${req.file.filename}`;
        }

        // Update category
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            updateData,
            { new: true }
        );

        
        res.json({
            success: true,
            message: 'Category updated successfully',
            redirectUrl: '/admin/categories'
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.json({
            success: false,
            message: 'Error updating category'
        });
    }
};

const listingCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        
        if (!category) {
            return res.json({
                success: false,
                message: 'Category not found'
            });
        }

        // Toggle the listed status
        category.listed = !category.listed;
        await category.save();

        res.json({
            success: true,
            message: `Category ${category.listed ? 'listed' : 'unlisted'} successfully`
        });
    } catch (error) {
        console.error('Toggle category status error:', error);
        res.json({
            success: false,
            message: 'Error updating category status'
        });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        
        if (!category) {
            return res.json({
                success: false,
                message: 'Category not found'
            });
        }

        // Soft delete
        category.isDeleted = true;
        await category.save();

        res.json({
            success: true,
            message: 'Category removed successfully'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.json({
            success: false,
            message: 'Error removing category'
        });
    }
};


module.exports ={ getAllCategories, getAddCategory, addCategory, getEditCategory, updateCategory, listingCategory, deleteCategory }