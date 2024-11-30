const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Check if it's an AJAX request
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(500).json({
            success: false,
            message: 'Server error occurred',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }

    // For regular requests
    res.status(500).render('error', {
        error: process.env.NODE_ENV === 'development' ? err : 'Internal server error'
    });
};

module.exports = errorHandler;