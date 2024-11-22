const User = require("../../models/User");


  
  const signupPage = async (req, res) => {
    try {
        // Render the signup form with default values for errors and old input
        res.render('signup', {
            errors: [],    // Empty errors array for first render
            oldInput: {},  // Empty old input for fresh form
            message: null, // No message for initial load
        });
    } catch (error) {
        console.error('Error loading Signup page:', error.message); // Log detailed error
        res.status(500).json({
            message: 'Error loading Signup page',
            error: error.message, // Provide specific error information for debugging
        });
    }
};

//   const loginPage = async (req, res) => {
//     try {
//         res.render('sign_in', {
//             // errors: [],
//             // oldInput: {},
//         });
//     } catch (error) {
//         res.status(500).json({ message: 'Error loading Signup page', error });
//         console.log('Signup page error');
//     }
//   };
const forgotPasswordPage = (req, res) => {
    res.render('forgot-password', { message: "" });
};

  
  const page404 = async (req, res) => {
    try {
        res.render('404');
    } catch (error) {
        res.status(500).json({ message: 'Error loading 404 page', error });
        console.log('404 page error');
    }
  };
  
  module.exports = { page404, signupPage , forgotPasswordPage};
  