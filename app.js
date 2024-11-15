const express = require('express');
const dotenv = require('dotenv');
const path = require('path')

const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');



// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set the views directory 
app.set('views', path.join(__dirname, 'views/user'));
app.set('views', path.join(__dirname, 'views/admin'));


// Serve static files 
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares
app.use(express.json());

app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
