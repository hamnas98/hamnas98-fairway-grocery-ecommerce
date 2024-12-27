const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const Category = require('../../models/Category');

const getCart = async (req, res) => {
    try {

         // Get all parent categories for the header
         const parentCategories = await Category.find({ 
            parent: null,
            isDeleted: false,
            listed: true 
        });
        const cart = await Cart.findOne({ user: req.session.user.id })
            .populate('items.product');

        res.render('cart', {
            parentCategories,
            cart,
            user: req.session.user
        });

    } catch (error) {
        console.error('Get cart error:', error);
        req.flash('error', 'Failed to load cart');
        res.redirect('/error');
    }
};
const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        console.log(req.body)

        if(!req.session.user){
                return res.status(404).json({
                    success: false,
                    message: 'Plaese Login to Add products to Cart'
                });
        }
        
        // Find product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check stock
        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Not enough stock available'
            });
        }

        // Find or create cart
        let cart = await Cart.findOne({ user: req.session.user.id });
        if (!cart) {
            cart = new Cart({ user: req.session.user.id, items: [] });
        }

        // Check if product already in cart
        const existingItem = cart.items.find(item => 
            item.product.toString() === productId
        );

        if (existingItem) {
            // Update quantity if total doesn't exceed stock
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot add more of this item'
                });
            }
            existingItem.quantity = newQuantity;
        } else {
            // Add new item
            cart.items.push({
                product: productId,
                quantity: quantity,
                price: product.price,
                discountPrice: product.discountPrice
            });
        }

        await cart.save();

        // Return updated cart with populated products
        cart = await Cart.findById(cart._id).populate('items.product');

        res.json({
            success: true,
            message: 'Product added to cart',
            cart: cart
        });

    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add to cart'
        });
    }
};

const updateCartQuantity = async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        // Validate quantity
        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quantity'
            });
        }

        // Find cart
        const cart = await Cart.findOne({ user: req.session.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Find item in cart
        const cartItem = cart.items.find(item => 
            item.product.toString() === productId
        );

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in cart'
            });
        }

        // Check stock
        const product = await Product.findById(productId);
        if (!product || product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Not enough stock available'
            });
        }

        // Update quantity
        cartItem.quantity = quantity;
        await cart.save();

        res.json({
            success: true,
            message: 'Cart updated',
            cart: await cart.populate('items.product')
        });

    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update cart'
        });
    }
};

const cartCount =  async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.session.user.id });
        const count = cart ? cart.items.length : 0;
        console.log(count)
        res.json({
            success: true,
            count: count
        });
    } catch (error) {
        console.error('Get cart count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cart count'
        });
    }
}

const removeFromCart = async (req, res) => {
    try {
        const { productId } = req.params;

        const cart = await Cart.findOne({ user: req.session.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.items = cart.items.filter(item => 
            item.product.toString() !== productId
        );

        await cart.save();

        res.json({
            success: true,
            message: 'Product removed from cart',
            cart: await cart.populate('items.product')
        });

    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove from cart'
        });
    }
};

const clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.session.user.id });
        if (cart) {
            cart.items = [];
            await cart.save();
        }

        res.json({
            success: true,
            message: 'Cart cleared'
        });

    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cart'
        });
    }
};
module.exports = { getCart, addToCart, updateCartQuantity, cartCount, removeFromCart, clearCart };