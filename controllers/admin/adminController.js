const Admin = require('../../models/Admin');
const bcrypt = require('bcryptjs');
const Order = require('../../models/Order');
const Product = require('../../models/Product');


    // Login Page
const getLoginPage =  (req, res) => {

        try {
            if (req.session.admin) {
                return res.redirect('/admin/dashboard');
            }
            res.render('login', { pageTitle: 'Admin Login' });
            

        } catch (error) {
            console.error('Login page error:', error);
            res.status(500).send('Server error');
        }
};

const login = async (req, res) => {
    const { email, password, rememberPassword } = req.body;

    try {
        // Find admin by email
        const admin = await Admin.findOne({ email });
        
        if (!admin) {
            return res.json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if admin is active
        if (!admin.isActive) {
            return res.json({
                success: false,
                message: 'Your account is deactivated'
            });
        }

        // Verify password
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Store admin in session
        req.session.admin = {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role
        };

        // If remember me is checked, extend session
        if (rememberPassword) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }

        // Save session before sending response
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.json({
                    success: false,
                    message: 'Login failed'
                });
            }

            res.json({
                success: true,
                message: 'Login successful',
                redirectUrl: '/admin/dashboard'
            });
        });

    } catch (error) {
        console.error('Login error:', error);
        res.json({
            success: false,
            message: 'Server error, please try again'
        });
    }
};
    // Dashboard
    const getDashboard = async (req, res) => {
        try {
            // Get orders statistics
            const [
                pendingOrders,
                cancelledOrders,
                processingOrders,
                todayOrders,
                topProducts,
                topCategories,
                topBrands,
                recentOrders,
                salesData,
                lowStockProducts
            ] = await Promise.all([
                Order.countDocuments({ orderStatus: 'Pending' }),
                Order.countDocuments({ orderStatus: 'Cancelled' }),
                Order.countDocuments({ orderStatus: 'Processing' }),
                Order.find({
                    createdAt: {
                        $gte: new Date().setHours(0, 0, 0, 0)
                    }
                }).select('discountTotal'),
                // Top 10 selling products
                Order.aggregate([
                    { $unwind: '$items' },
                    {
                        $group: {
                            _id: '$items.product',
                            totalQuantity: { $sum: '$items.quantity' },
                            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                        }
                    },
                    { $sort: { totalQuantity: -1 } },
                    { $limit: 10 },
                    {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    { $unwind: '$product' }
                ]),
                // Top categories
                Order.aggregate([
                    { $unwind: '$items' },
                    {
                        $lookup: {
                            from: 'products',
                            localField: 'items.product',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    { $unwind: '$product' },
                    {
                        $lookup: {
                            from: 'categories',
                            localField: 'product.category',
                            foreignField: '_id',
                            as: 'category'
                        }
                    },
                    { $unwind: '$category' },
                    {
                        $group: {
                            _id: '$category._id',
                            name: { $first: '$category.name' },
                            count: { $sum: 1 },
                            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]),
                // Top brands
                Order.aggregate([
                    { $unwind: '$items' },
                    {
                        $lookup: {
                            from: 'products',
                            localField: 'items.product',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    { $unwind: '$product' },
                    {
                        $group: {
                            _id: '$product.brand',
                            count: { $sum: 1 },
                            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]),
                // Recent orders
                Order.find()
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate('user', 'name email'),
                // Sales data for chart
                Order.aggregate([
                    {
                        $match: {
                            createdAt: {
                                $gte: new Date(new Date().setDate(new Date().getDate() - 30))
                            }
                        }
                    },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                            total: { $sum: "$discountTotal" }
                        }
                    },
                    { $sort: { "_id": 1 } }
                ]),
                 // Add low stock products query
                    Product.find({ stock: { $lte: 10 } })  // Adjust threshold as needed
                    .sort({ stock: 1 })
                    .limit(5)
                    .select('name stock images price')
            ]);
    
            const todayIncome = todayOrders.reduce((sum, order) => sum + order.discountTotal, 0);
            const yearlySalesData = await Order.aggregate([
                {
                    $group: {
                        _id: { $year: "$createdAt" },
                        total: { $sum: "$discountTotal" }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);
    
            const monthlySalesData = await Order.aggregate([
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        total: { $sum: "$discountTotal" }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } }
            ]);

            
    
            res.render('dashboard', {
                admin: req.session.admin,
                path: '/admin/dashboard',
                stats: {
                    pendingOrders,
                    cancelledOrders,
                    processingOrders,
                    todayIncome
                },
                topProducts,
                topCategories,
                topBrands,
                recentOrders,
                salesData: JSON.stringify(salesData),
                lowStockProducts,
                yearlySalesData: JSON.stringify(yearlySalesData),
                monthlySalesData: JSON.stringify(monthlySalesData)
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).send('Server error');
        }
    };

const logout = (req, res) => {
    try {
    
        req.session.admin = null;
        
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error logging out'
                });
            }

            // Clear any cookies
            res.clearCookie('connect.sid');
            
            res.json({
                success: true,
                redirectUrl: '/admin/login'
            });
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging out'
        });
    }
};

module.exports = { getLoginPage, login, getDashboard , logout };