const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const Category = require('../../models/Category');

const getCart = async (req, res) => {
    try {
        // Fetch all parent categories for the header
        const parentCategories = await Category.find({ 
            parent: null, 
            isDeleted: false, 
            listed: true 
        });

        // Fetch the user's cart
        const cart = await Cart.findOne({ user: req.session.user.id })
            .populate('items.product');

        // Recalculate totals dynamically based on the latest product data
        if (cart) {
            cart.total = cart.items.reduce((sum, item) => {

                const price = item.product.price;
                return sum + (price * item.quantity);
            }, 0);

            cart.discountTotal = cart.items.reduce((sum, item) => {
  
                const price = item.product.discountPrice || item.product.price;
                return sum + (price * item.quantity);
            }, 0);


            await cart.save();
        }

        // Render the cart page
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
        if(!req.session.user){
            return res.status(404).json({
                success: false,
                message: 'Please Login to Add products to Cart'
            });
        }
        const { productId, quantity } = req.body;

        // Find cart
        const cart = await Cart.findOne({ user: req.session.user.id })
            .populate('items.product');
            
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Find item in cart
        const cartItem = cart.items.find(item => 
            item.product._id.toString() === productId
        );

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in cart'
            });
        }

        // Check stock
        if (!cartItem.product || cartItem.product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Not enough stock available'
            });
        }

        // Update quantity
        cartItem.quantity = quantity;

        // Recalculate totals
        cart.total = cart.items.reduce((sum, item) => {
            const price = item.product.price;
            return sum + (price * item.quantity);
        }, 0);

        cart.discountTotal = cart.items.reduce((sum, item) => {
            const price = item.product.discountPrice || item.product.price;
            return sum + (price * item.quantity);
        }, 0);

        await cart.save();

        res.json({
            success: true,
            message: 'Cart updated',
            cart: cart,
            cartCount: cart.items.length
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

        const cart = await Cart.findOne({ user: req.session.user.id })
            .populate('items.product');
            
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.items = cart.items.filter(item => 
            item.product._id.toString() !== productId
        );

        // Recalculate totals
        cart.total = cart.items.reduce((sum, item) => {
            const price = item.product.price;
            return sum + (price * item.quantity);
        }, 0);

        cart.discountTotal = cart.items.reduce((sum, item) => {
            const price = item.product.discountPrice || item.product.price;
            return sum + (price * item.quantity);
        }, 0);

        await cart.save();

        res.json({
            success: true,
            message: 'Product removed from cart',
            cart: cart,
            cartCount: cart.items.length
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

const verifyCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.session.user.id })
            .populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.json({
                success: false,
                message: 'Your cart is empty'
            });
        }

        // Check stock availability
        let unavailableItems = [];
        for (const item of cart.items) {
            if (item.quantity > item.product.stock) {
                unavailableItems.push(item.product.name);
            }
        }

        if (unavailableItems.length > 0) {
            return res.json({
                success: false,
                message: unavailableItems.length > 1 
                    ? `Some items are out of stock: ${unavailableItems.join(', ')}`
                    : `${unavailableItems[0]} is out of stock`
            });
        }

        res.json({
            success: true
        });

    } catch (error) {
        console.error('Verify cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify cart'
        });
    }
};

module.exports = { getCart, addToCart, updateCartQuantity, cartCount, removeFromCart, clearCart, verifyCart };