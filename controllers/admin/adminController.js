const Admin = require('../../models/Admin'); // Path to your Admin model
const bcrypt = require('bcrypt');
const User = require('../../models/User');
const Category = require('../../models/Category')


const loadLogin =  (req,res) => {

    if (req.session.isAdmin || req.session.adminId) {
        return res.redirect('/admin/dashboard');
    }else{
        res.render('adminLogin')
    }
};

const adminSignIn = async (req, res) => {

    try {
        const { email, password } = req.body;

        // Check if Admin exists
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Store admin info in session
        req.session.adminId = admin._id; // Store Admin ID in session
        req.session.isAdmin = true; // Flag to indicate admin user

        console.log('Admin successfully logged in:', admin.name);

        return res.status(200).json({ success: true, redirectUrl: '/admin/dashboard' });
    } catch (error) {
        console.error("Admin Sign-In Error:", error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const loadDashboard = (req, res) => {
    res.render('dashboard')
};

const logout = (req, res) => {
   try {
        req.session.destroy((err) => {
            if (err) {
            return res.status(500).json({ success: false, message: 'Failed to log out' });
            return res.redirect('/admin/PageError');
            }
            res.redirect('/admin/logout', { success: true, message: 'Logged out successfully' });
        })

   } catch (error) {
    res.redirect('/admin/pageError')
   }
};


const userList = async (req, res) => {
    const { search = '', page = 1, limit = 10 } = req.query;

    try {
        // Convert page and limit to numbers
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);

        // Build search filter if search query exists
        const searchFilter = search ? {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        } : {};

        // Fetch total users count for pagination
        const totalUsers = await User.countDocuments(searchFilter);

        // Fetch users for the current page with pagination and search
        const users = await User.find(searchFilter)
            .skip((pageNumber - 1) * limitNumber) // Skip users for previous pages
            .limit(limitNumber) // Limit number of users per page
            .sort({ createdAt: -1 }); // Optionally, you can sort by creation date

        // Calculate total pages
        const totalPages = Math.ceil(totalUsers / limitNumber);

        // Render the user list with the pagination and search results
        res.render('customers', {
            users,
            page: pageNumber,
            limit: limitNumber,
            totalPages,
            searchQuery: search
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    }
};
const blockUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        user.isBlocked = true;
        await user.save();
        res.redirect('/admin/users');
    } catch (error) {
        console.error("Error blocking user:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const unblockUSer = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        user.isBlocked = false;
        await user.save();
        res.redirect('/admin/users');
    } catch (error) {
        console.error("Error unblocking user:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
// category management


const getCategories = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const pageSize = Math.max(parseInt(limit, 10) || 10, 1);

        // Query to exclude soft-deleted categories and search by name
        const query = { isDeleted: { $ne: true } }; // Exclude categories with isDeleted = true
        if (search) {
            query.name = { $regex: search, $options: 'i' }; // Add case-insensitive name filter
        }

        const totalCategories = await Category.countDocuments(query);
        const totalPages = Math.ceil(totalCategories / pageSize);

        const categories = await Category.find(query)
            .populate('parent', 'name') // Populate parent category name
            .skip((pageNum - 1) * pageSize)
            .limit(pageSize);

        res.render('allCategories', {
            categories,
            search,
            page: pageNum,
            totalPages,
            limit: pageSize,
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Failed to load categories.');
        res.redirect('/admin');
    }
};


const loadAddCategory = async (req, res) => {
    try {
        const categories = await Category.find();

        res.render('newCategory', {
            categories,
            name: '',
            parent: '',
            imagePreview: null,
            message: '',
            successMessage: '',
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('newCategory', {
            message: 'Internal server error.',
            categories: [],
            name: '',
            parent: '',
            imagePreview: null,
        });
    }
};

const addCategory = async (req, res) => {
    try {
        const { name, parentCategory } = req.body;
        console.log(parentCategory)
        const normalizedName = name.trim().toLowerCase();
        const image = req.processedPaths ? req.processedPaths[0] : null;

        const existingCategory = await Category.findOne({ name: normalizedName });
        if (existingCategory) {
            return res.status(400).render('newCategory', {
                message: 'Category already exists.',
                name,
                parent: parentCategory,
                categories: await Category.find(),
                imagePreview: image || null,
            });
        }

        const category = new Category({
            name: normalizedName,
            parent: parentCategory || null,
            image,
        });
        await category.save();

        req.flash('success', 'Category added successfully!');
        res.redirect('/admin/categories');
    } catch (error) {
        console.error(error);
        res.status(500).render('newCategory', {
            message: 'Internal server error.',
            name,
            parent: parentCategory,
            categories: await Category.find(),
        });
    }
};
const editCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the category by ID
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).render('admin/404', { message: 'Category not found.' });
        }

        // Get all categories for parent dropdown
        const categories = await Category.find({ isDeleted: { $ne: true } });

        // Render the edit category form with the current category details
        res.render('editCategory', {
            category,    // Existing category details
            categories,  // All categories to populate the parent selection
            imagePreview: category.image || null,  // Pass image preview if it exists
            message: '', // Error message (if any)
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('admin/500', { message: 'Internal server error.' });
    }
};
const updateCategory = async (req, res) => {
    try {
        const {id} =req.params;
        const { name, parentCategory } = req.body;

        const normalizedName = name.trim().toLowerCase();
        const image = req.processedPaths ? req.processedPaths[0] : null;
        console.log(image)

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).render('admin/404', { message: 'Category not found.' });
        }

            category.name= normalizedName;
            category.parent=parentCategory || null;
            category.image=image;
            await category.save();

        req.flash('success', 'Category Updated successfully!');
        res.redirect('/admin/categories');
    } catch (error) {
        console.error(error);
        res.status(500).render('admin/500', { message: 'Internal server error.' });
    }
};



const deleteCategory = async (req, res) => {
 
    try {
        const { id } = req.params;

        // Find the category by ID
        const category = await Category.findById(id);
 
        if (!category) {
            return res.status(404).render('admin/404', { message: 'Category not found.' });
        }

        // Mark the category as deleted (soft delete)
        category.isDeleted = true;
        await category.save();

        // Redirect to categories page
        res.redirect('/admin/categories');
    
    } catch (error) {
        console.error(error);
        
        res.status(500).render('admin/500', { message: 'Internal server error' });
    }
};






module.exports = { adminSignIn ,loadLogin ,loadDashboard ,logout ,userList, 
    blockUser ,unblockUSer ,getCategories ,loadAddCategory,addCategory,
deleteCategory,editCategory ,updateCategory};
