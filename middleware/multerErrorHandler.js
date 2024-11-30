const multerErrorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer-specific errors
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.json({
                    success: false,
                    message: 'File size is too large'
                });
            case 'LIMIT_FILE_COUNT':
                return res.json({
                    success: false,
                    message: 'Too many files uploaded'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.json({
                    success: false,
                    message: 'Unexpected field'
                });
            default:
                return res.json({
                    success: false,
                    message: 'Error uploading file'
                });
        }
    } else if (err) {
        // Custom error (like file type)
        return res.json({
            success: false,
            message: err.message
        });
    }
    next();
};

module.exports = multerErrorHandler;