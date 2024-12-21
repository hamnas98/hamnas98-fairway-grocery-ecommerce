const User = require('../../models/User');

const getUsers = async (req, res) => {
    try {
        // First check all users without any filter
        const allUsersNoFilter = await User.find({});
        console.log('All users without filter:', allUsersNoFilter);

        const page = parseInt(req.query.page) || 1;
        const limit = 1;
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
        const userId = req.params.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Toggle block status
        user.isBlocked = !user.isBlocked;
        user.blockedAt = user.isBlocked ? new Date() : null;
        await user.save();

        // Handle active session if user is blocked
        if (user.isBlocked) {
            // Force logout from all sessions
            req.sessionStore.all((error, sessions) => {
                if (error) {
                    console.error('Session store error:', error);
                    return;
                }

                if (sessions) {
                    Object.keys(sessions).forEach((sid) => {
                        const session = sessions[sid];
                        if (session.user && session.user.id === userId) {
                            req.sessionStore.destroy(sid, (err) => {
                                if (err) console.error('Session destruction error:', err);
                            });
                        }
                    });
                }
            });
        }

        res.json({
            success: true,
            message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
            isBlocked: user.isBlocked
        });

    } catch (error) {
        console.error('Toggle user block error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update user status' 
        });
    }
};


const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Soft delete the user
        user.isDeleted = true;
        user.deletedAt = new Date();
        await user.save();

        // Force logout from all sessions
        req.sessionStore.all((error, sessions) => {
            if (error) {
                console.error('Session store error:', error);
                return;
            }

            if (sessions) {
                Object.keys(sessions).forEach((sid) => {
                    if (sessions[sid].userId === userId) {
                        req.sessionStore.destroy(sid, (err) => {
                            if (err) console.error('Session destruction error:', err);
                        });
                    }
                });
            }
        });

        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete user' 
        });
    }
};



module.exports = { getUsers, toggleUserBlock , deleteUser }