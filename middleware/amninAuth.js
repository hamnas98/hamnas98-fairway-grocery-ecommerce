const Admin = require('../models/Admin')

const adminAuth = async (req, res, next) => {
    try {
        if (!req.session.admin) {
            return res.redirect('/admin/login');
        }
        const admin = await Admin.findById(req.session.admin.id);
        if (!admin || admin.isBlocked) {
            req.session.destroy();
            return res.redirect('/admin/login');
        }
        next();
    } catch (error) {
        console.error(error);
        res.redirect('/admin/login'); 
    }
 };


module.exports = adminAuth;