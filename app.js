const express = require('express');
const dotenv = require('dotenv');
const path = require('path')
const session = require('express-session');
const flash = require('connect-flash');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const multerErrorHandler = require('./middleware/multerErrorHandler');
const passport = require('passport');
require('./config/passport');
const nocache = require('nocache');


// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(multerErrorHandler);

app.use(nocache());
// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 72 * 60 * 60 * 1000 // 72 hours
    }
}));

// Flash messages
app.use(flash());
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// View engine setup
// app.js
app.set('view engine', 'ejs');
app.set('views', [
    path.join(__dirname, 'views/admin'),
    path.join(__dirname, 'views/user')
]);




app.use(passport.initialize());
app.use(passport.session());

app.use('/admin', adminRoutes);


app.use('/', userRoutes)


app.use((req, res) => {
    // Check if the request path starts with /admin
    if (req.path.startsWith('/admin')) {
        res.status(404).render('error', { 
            error: 'Page not found',
            admin: req.session.admin || null
        });
    } else {
        res.status(404).render('error', { 
            error: 'Page not found',
            user: req.session.user || null
        });
    }
});


app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    const statusCode = err.statusCode || 500;
    const errorMessage = process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong';

    // Check if it's an admin route
    if (req.path.startsWith('/admin')) {
        res.status(statusCode).render('error', {
            error: errorMessage,
            admin: req.session.admin || null
        });
    } else {
        res.status(statusCode).render('error', {
            error: errorMessage,
            user: req.session.user || null
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));