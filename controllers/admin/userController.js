const User = require('../../models/User');

const getUsers = async (req, res) => {
    try {
        // First check all users without any filter
        const allUsersNoFilter = await User.find({});
        console.log('All users without filter:', allUsersNoFilter);

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Start with empty query
        let query = {};
        const filters = {
            search: req.query.search || '',
            isBlocked: req.query.isBlocked || ''
        };

        if (filters.search) {
            query.$or = [
                { name: new RegExp(filters.search, 'i') },
                { email: new RegExp(filters.search, 'i') }
            ];
        }

        if (filters.isBlocked) {
            query.isBlocked = filters.isBlocked === 'true';
        }

   
        query.isDeleted = { $ne: true };

        const [users, total] = await Promise.all([
            User.find(query).skip(skip).limit(limit),
            User.countDocuments(query)
        ]);

        console.log('Final users:', users);

        res.render('users', {
            admin: req.session.admin,
            users,
            filters,
            pagination: {
                page,
                totalPages: Math.ceil(total / limit),
                total
            },
            path: '/admin/users'
        });
    } catch (error) {
        console.error('Error in getUsers:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const toggleUserBlock = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        user.isBlocked = !user.isBlocked;
        await user.save();

        res.json({
            success: true,
            message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update user status' });
    }
};

const deleteUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isDeleted: true });
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
};


module.exports = { getUsers, toggleUserBlock , deleteUser }