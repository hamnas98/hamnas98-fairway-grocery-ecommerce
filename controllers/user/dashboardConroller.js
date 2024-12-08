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

                     

        res.render('userDashboard', {
            parentCategories,
            pageTitle: 'Fairway Supermarket',
            user :req.session.user
        });



    } catch (error) {
        console.error('New Products error:', error);
        res.status(500).render('error', { message: 'Failed to load New Products page' });
    }
};


module.exports = { getDashboard }