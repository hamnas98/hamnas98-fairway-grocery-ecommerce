const Category = require('../../models/Category');
const Product = require('../../models/Product');
const User = require('../../models/User');

const getDashboard = async (req, res) => {
    try {

        // Get all parent categories for the header
        const parentCategories = await Category.find({ 
          parent: null,
          isDeleted: false,
          listed: true 
      });
      console.log(req.session.user,'a')
      const user = await User.findById(req.session.user.id)
      req.session.user = user
      console.log(req.session.user,'b')

        res.render('userDashboard', {
            parentCategories,
            pageTitle: 'Fairway Supermarket',
            user:req.session.user 
        });



    } catch (error) {
        console.error('DashBoard error:', error);
        res.status(500).render('error', { message: 'Failed to load DashBoard  page' });
    }
};

module.exports = { getDashboard }