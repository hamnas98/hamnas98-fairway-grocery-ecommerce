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
;

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

// Error handler should include admin data
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        error: err.message,
        admin: req.session.admin 
    });
});

// app.use((req, res, next) => {
//     if (req.session) {
//         res.locals.user = req.session.user || null;
//         res.locals.admin = req.session.admin || null;
//     }
//     next();
// });
app.use(passport.initialize());
app.use(passport.session());

app.use('/admin', adminRoutes);


app.use('/', userRoutes)

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { error: err });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));