const express = require('express');
const dotenv = require('dotenv');
const path = require('path')
const session = require('express-session');

const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');


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
        maxAge: 72*60*60*1000 //72 hrs
    } 
}));


// Set EJS as the view engine
app.set('view engine', 'ejs');

// View engine setup
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);


// Serve static files 
app.use(express.static(path.join(__dirname, 'public')));


// Routes

app.use('/', userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
