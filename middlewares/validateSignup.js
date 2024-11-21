
const { body, validationResult } = require('express-validator');



// Validation rules
const validateSignup = [
    
    body('name')
        .notEmpty().withMessage('Name is required')
        .isAlpha('en-US', { ignore: ' ' }).withMessage('Name must contain only letters and spaces')
        .trim()
        .escape(),
        

    body('email')
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail(),

    body('phone')
        .isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits')
        .isNumeric().withMessage('Phone number must be numeric')
        .trim()
        .escape(),

    body('password')
        .isStrongPassword().withMessage(
            'Password must contain at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character'
        ),
    
    body('c-password')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match')
        .trim()
        .escape(),

    // Error handling middleware
    (req, res, next) => {
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Render the signup page with errors
            return res.status(400).render('signup', {
                errors: errors.array(),
                oldInput: req.body,
            });
        }
        next();
    },
];

module.exports = validateSignup;
