const express = require('express');
const dotenv = require('dotenv');
const path = require('path')
const session = require('express-session');
const passport = require('./config/passport');
const flash = require('connect-flash');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');


// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

//Middlewares
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        httpOnly:true, 
        maxAge: 72*60*60*1000 //72 hrs
    } 
}));

// Flash middleware
app.use(flash());

// Middleware to make flash messages available in views
app.use((req, res, next) => {
    res.locals.successMessage = req.flash('success');
    res.locals.errorMessage = req.flash('error');
    next();
});

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Set EJS as the view engine
app.set('view engine', 'ejs');

// View engine setup
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);



// Serve static files 
app.use(express.static(path.join(__dirname, 'public')));


// Routes

app.use('/', userRoutes);
app.use('/admin',adminRoutes)


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
