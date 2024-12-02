const fs = require('fs').promises;
const path = require('path');

const deleteFile = async (filepath) => {
    try {
        const fullPath = path.join(__dirname, '../public', filepath);
        await fs.unlink(fullPath);
        return true;
    } catch (error) {
        console.error(`Error deleting file ${filepath}:`, error);
        return false;
    }
};

module.exports = { deleteFile };