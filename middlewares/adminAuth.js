const Admin = require('../models/Admin');

const adminAuth = (req, res, next) => {
    if (req.session.isAdmin && req.session.adminId) {
        Admin.findById(req.session.adminId)
            .then(admin => {
                if (admin) {
                  
                    next(); // Proceed to the next middleware or route handler
                } else {
                    res.status(404).json({ success: false, message: 'Admin not found' });
                }
            })
            .catch(error => {
                console.error('Error in adminAuth middleware:', error);
                res.status(500).json({ success: false, message: 'Internal server error' });
            });
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized access' });
    }
};

module.exports =adminAuth