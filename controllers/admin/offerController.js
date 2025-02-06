const ProductOffer = require('../../models/ProductOffer');
const CategoryOffer = require('../../models/CategoryOffer');
const Product = require('../../models/Product');
const Category = require('../../models/Category');

const getOffers = async (req, res) => {
    try {
        const [productOffers, categoryOffers, products, categories] = await Promise.all([
            ProductOffer.find().populate('product'),
            CategoryOffer.find().populate('category'),
            Product.find({isDeleted: false}),
            Category.find({isDeleted: false})
        ]);
 
        res.render('offers', {
            productOffers,
            categoryOffers,
            products,
            categories,
            path: '/admin/offers'
        });
    } catch (error) {
        console.error('Get offers error:', error);
        req.flash('error', 'Failed to load offers');
        res.redirect('/admin/dashboard');
    }
 };


 function validateDiscountAmount(price, discountType, discountAmount) {
    if (discountType === 'percentage') {
        const discountedPrice = price * (1 - discountAmount / 100);
        return discountedPrice > 0;
    } else {
        // For flat amount
        return price - discountAmount > 0;
    }
}

 const createProductOffer = async (req, res) => {
    try {
        const { productId, discountType, discountAmount, startDate, endDate } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        if (!validateDiscountAmount(product.price, discountType, discountAmount)) {
            return res.status(400).json({
                success: false,
                message: 'Discount amount cannot result in negative or zero price'
            });
        }

        if(!startDate|| !endDate){
            return res.status(400).json({
                success: false,
                message: 'Please enter start date and end date'
            });     
        }

        // Check for existing active offer
        const existingOffer = await ProductOffer.findOne({
            product: productId,
            isActive: true,
            endDate: { $gt: new Date() }
        });

        if (existingOffer) {
            return res.status(400).json({
                success: false,
                message: 'Product already has an active offer'
            });
        }

        const offer = await ProductOffer.create({
            product: productId,
            discountType,
            discountAmount,
            startDate: new Date(startDate),
            endDate: new Date(endDate)
        });

        // Update product price
        await updateProductDiscountPrice(productId);

        res.json({
            success: true,
            message: 'Product offer created successfully'
        });

    } catch (error) {
        console.error('Create product offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product offer'
        });
    }
};

async function updateProductDiscountPrice(productId) {
    const product = await Product.findById(productId);
    const offer = await ProductOffer.findOne({
        product: productId,
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gt: new Date() }
    });
 
    const categoryOffer = await CategoryOffer.findOne({
        category: product.category,
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gt: new Date() }
    });
 
    // Calculate all possible discount prices
    let prices = [];
    
    // Original discount price if exists
    if (product.discountPercentage > 0) {
        product.productDiscountPrice = product.discountPrice;
        product.productDiscountPercentage = product.discountPercentage;
        prices.push(product.price * (1 - product.discountPercentage / 100));
    }
 
    // Product offer price
    if (offer) {
        const offerPrice = offer.discountType === 'percentage' ? 
            product.price * (1 - offer.discountAmount / 100) :
            product.price - offer.discountAmount;
        prices.push(offerPrice);
    }
 
    // Category offer price
    if (categoryOffer) {
        const catOfferPrice = categoryOffer.discountType === 'percentage' ?
            product.price * (1 - categoryOffer.discountAmount / 100) :
            product.price - categoryOffer.discountAmount;
        prices.push(catOfferPrice);
    }
 
       prices = prices.filter(price => price > 0);

    // Set discount price to lowest (best) valid offer
    if (prices.length > 0) {
        product.discountPrice = Math.min(...prices).toFixed(2);
        product.discountPercentage = Math.ceil(((product.price - product.discountPrice) / product.price) * 100).toFixed(2);
    } else {
        product.discountPrice = null;
        product.discountPercentage = 0;
    }


 
    await product.save();
 }

 const createCategoryOffer = async (req, res) => {
    try {
        const { categoryId, discountType, discountAmount, startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Please enter start date and end date'
            });     
        }

        const products = await Product.find({ category: categoryId });
        
        // Check which products would get negative or zero price
        const invalidProducts = products.filter(product => 
            !validateDiscountAmount(product.price, discountType, discountAmount)
        );

        // Check for existing active offer
        const existingOffer = await CategoryOffer.findOne({
            category: categoryId,
            isActive: true,
            endDate: { $gt: new Date() }
        });

        if (existingOffer) {
            return res.status(400).json({
                success: false,
                message: 'Category already has an active offer'
            });
        }

        const offer = await CategoryOffer.create({
            category: categoryId,
            discountType,
            discountAmount,
            startDate: new Date(startDate),
            endDate: new Date(endDate)
        });

        // Update all products in category
        const updateResult = await updateCategoryProductsPrices(categoryId);

        // Prepare response message
        let message = 'Category offer created successfully';
        if (invalidProducts.length > 0) {
            message += `. Offer not applied to ${invalidProducts.length} products due to price restrictions`;
        }

        res.json({
            success: true,
            message: message,
            invalidProducts: invalidProducts.length > 0 ? invalidProducts.map(p => ({
                name: p.name,
                price: p.price,
                reason: 'Price would become negative or zero'
            })) : []
        });

    } catch (error) {
        console.error('Create category offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category offer'
        });
    }
};

async function updateCategoryProductsPrices(categoryId) {
    const products = await Product.find({ category: categoryId });
    const categoryOffer = await CategoryOffer.findOne({
        category: categoryId,
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gt: new Date() }
    });

    const results = {
        updatedProducts: 0,
        skippedProducts: 0,
        skippedDetails: []
    };

    for (const product of products) {
        let prices = [];
        let skipReason = null;

        // Original product discount
        if (product.discountPercentage > 0) {
            const originalDiscountPrice = product.price * (1 - product.discountPercentage / 100);
            if (originalDiscountPrice > 0) {
                prices.push(originalDiscountPrice);
            }
        }

        // Product-specific offer
        const productOffer = await ProductOffer.findOne({
            product: product._id,
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gt: new Date() }
        });

        if (productOffer) {
            const prodOfferPrice = productOffer.discountType === 'percentage' ?
                product.price * (1 - productOffer.discountAmount / 100) :
                product.price - productOffer.discountAmount;
            if (prodOfferPrice > 0) {
                prices.push(prodOfferPrice);
            }
        }

        // Category offer
        if (categoryOffer) {
            const catOfferPrice = categoryOffer.discountType === 'percentage' ?
                product.price * (1 - categoryOffer.discountAmount / 100) :
                product.price - categoryOffer.discountAmount;
            
            if (catOfferPrice <= 0) {
                skipReason = 'Category offer would make price zero or negative';
            } else {
                prices.push(catOfferPrice);
            }
        }

        if (prices.length > 0) {
            product.discountPrice = Math.min(...prices).toFixed(2);
            product.discountPercentage = Math.ceil(((product.price - product.discountPrice) / product.price) * 100).toFixed(2);
            results.updatedProducts++;
            await product.save();
        } else {
            product.discountPrice = null;
            product.discountPercentage = 0;
            results.skippedProducts++;
            results.skippedDetails.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                reason: skipReason || 'No valid discount price available'
            });
            await product.save();
        }
    }

    return results;
}

const deleteProductOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await ProductOffer.findById(id);
        
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }

        const product = await Product.findById(offer.product);
        await offer.deleteOne();

        // Restore original product discount if exists
        if (product.productDiscountPrice !== null) {
            product.discountPrice = product.productDiscountPrice;
            product.discountPercentage = product.productDiscountPercentage;
            product.productDiscountPrice = null;
            product.productDiscountPercentage = 0;
        } else {
            // Check for other active offers
            await updateProductDiscountPrice(product._id);
        }

        await product.save();
        res.json({ success: true, message: 'Offer deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete offer' });
    }
};

const deleteCategoryOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await CategoryOffer.findById(id);
        
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }

        const products = await Product.find({ category: offer.category });
        await offer.deleteOne();

        // Restore original discounts for each product
        for (const product of products) {
            if (product.productDiscountPrice !== null) {
                product.discountPrice = product.productDiscountPrice;
                product.discountPercentage = product.productDiscountPercentage;
                product.productDiscountPrice = null;
                product.productDiscountPercentage = 0;
            } else {
                // Check for other active offers
                await updateCategoryProductsPrices(product._id);
            }
            await product.save();
        }

        res.json({ success: true, message: 'Offer deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete offer' });
    }
};

module.exports = { getOffers, createProductOffer, createCategoryOffer, deleteProductOffer , deleteCategoryOffer}