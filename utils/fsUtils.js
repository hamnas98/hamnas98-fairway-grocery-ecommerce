const fs = require('fs').promises;

const ensureDirectoryExists = async (dir) => {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (error) {
        console.error('Directory creation error:', error);
        throw new Error('Failed to create directory');
    }
};

module.exports = { ensureDirectoryExists };
