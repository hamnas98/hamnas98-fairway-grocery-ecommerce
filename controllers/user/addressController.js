const Address = require('../../models/Address');
const Category = require('../../models/Category');

const getAllAddresses = async (req, res) => {
    try {

         // Get all parent categories for the header
         const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        });

        const addresses = await Address.find({
            user: req.session.user.id,
            isDeleted: false
        }).sort({ isDefault: -1, createdAt: -1 });
        res.render('addresses', {
            parentCategories,
            addresses,
            user: req.session.user
        });
    } catch (error) {
        console.error('Get addresses error:', error);
        req.flash('error', 'Failed to load addresses');
        res.redirect('/dashboard');
    }
};

const addAddress = async (req, res) => {
    try {
        const {
            addressType,
            name,
            mobile,
            flat,
            addressLine,
            city,
            state,
            pincode,
            isDefault
        } = req.body;

        // If setting as default or first address
        if (isDefault) {
            await Address.updateMany(
                { user: req.session.user.id },
                { $set: { isDefault: false } }
            );
        }

        // Check if this is the first address
        const addressCount = await Address.countDocuments({
            user: req.session.user.id,
            isDeleted: false
        });

        const address = new Address({
            user: req.session.user.id,
            addressType,
            name,
            mobile,
            flat,
            addressLine,
            city,
            state,
            pincode,
            isDefault: isDefault || addressCount === 0 // Make first address default
        });

        await address.save();

        res.json({
            success: true,
            message: 'Address added successfully'
        });
    } catch (error) {
        console.error('Add address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add address'
        });
    }
};
const getAddress = async (req, res) => {
    try {
        const address = await Address.findOne({
            _id: req.params.id,
            user: req.session.user.id,
            isDeleted: false
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        res.json({
            success: true,
            address
        });
    } catch (error) {
        console.error('Get address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get address'
        });
    }
};

const updateAddress = async (req, res) => {
    try {
        const {
            addressType,
            name,
            mobile,
            flat,
            addressLine,
            city,
            state,
            pincode,
            isDefault
        } = req.body;

        const address = await Address.findOne({
            _id: req.params.id,
            user: req.session.user.id,
            isDeleted: false
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        if (isDefault && !address.isDefault) {
            await Address.updateMany(
                { user: req.session.user.id },
                { $set: { isDefault: false } }
            );
        }

        address.addressType = addressType;
        address.name = name;
        address.mobile = mobile;
        address.flat = flat;
        address.addressLine = addressLine;
        address.city = city;
        address.state = state;
        address.pincode = pincode;
        address.isDefault = isDefault;

        await address.save();

        res.json({
            success: true,
            message: 'Address updated successfully'
        });
    } catch (error) {
        console.error('Update address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update address'
        });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const address = await Address.findOne({
            _id: req.params.id,
            user: req.session.user.id,
            isDeleted: false
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        address.isDeleted = true;
        await address.save();

        // If deleted address was default, set another address as default
        if (address.isDefault) {
            const newDefaultAddress = await Address.findOne({
                user: req.session.user.id,
                isDeleted: false,
                _id: { $ne: address._id }
            }).sort({ createdAt: 1 });

            if (newDefaultAddress) {
                newDefaultAddress.isDefault = true;
                await newDefaultAddress.save();
            }
        }

        res.json({
            success: true,
            message: 'Address deleted successfully'
        });
    } catch (error) {
        console.error('Delete address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete address'
        });
    }
};

const setDefaultAddress = async (req, res) => {
    try {
        await Address.updateMany(
            { user: req.session.user.id },
            { $set: { isDefault: false } }
        );

        const address = await Address.findOneAndUpdate(
            {
                _id: req.params.id,
                user: req.session.user.id,
                isDeleted: false
            },
            { isDefault: true },
            { new: true }
        );

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        res.json({
            success: true,
            message: 'Default address updated successfully'
        });
    } catch (error) {
        console.error('Set default address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set default address'
        });
    }
};

module.exports = {getAllAddresses, addAddress, getAddress, updateAddress, deleteAddress, setDefaultAddress };