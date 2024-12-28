

async function fetchCartCount() {
    try {
        const response = await fetch('/cart/count');
        const data = await response.json();
        
        if (data.success) {
            updateCartCount(data.count);
        }
    } catch (error) {
        console.error('Error fetching cart count:', error);
    }
}

// Function to update cart count with animation
function updateCartCount(count) {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        // Add animation class before updating
        cartCount.classList.add('count-update');
        
        // Update the count
        cartCount.textContent = count;

        // Remove animation class after animation completes
        setTimeout(() => {
            cartCount.classList.remove('count-update');
        }, 300);
    }
}


document.addEventListener('DOMContentLoaded', function() {
    fetchCartCount();
});
let isProcessing = false; // Prevent multiple simultaneous requests

// Function to toggle quantity selector
function toggleQuantitySelector(button, productId) {
    const wrapper = button.closest('.add-to-cart-wrapper');
    const addButton = wrapper.querySelector('.add-to-cart-btn');
    const quantitySelector = wrapper.querySelector('.quantity-selector');
    
    addButton.style.display = 'none';
    quantitySelector.style.display = 'flex';

    // Auto add to cart with quantity 1
    addToCart(productId);
}

// Function to handle quantity changes
async function handleQuantity(button, isIncrement, productId) {
    if (isProcessing) return;

    const wrapper = button.closest('.add-to-cart-wrapper');
    const quantitySelector = button.closest('.quantity-selector');
    const addButton = wrapper.querySelector('.add-to-cart-btn');
    const quantitySpan = quantitySelector.querySelector('.qty-value');
    let currentQuantity = parseInt(quantitySpan.textContent);
    let newQuantity;

    if (isIncrement) {
        if (currentQuantity < 10) { // Maximum limit set to 10
            newQuantity = currentQuantity + 1;
        } else {
            showCartNotification('Maximum quantity limit reached');
            return;
        }
    } else {
        if (currentQuantity > 1) {
            newQuantity = currentQuantity - 1;
        } else {
            // Reset to add to cart button when quantity becomes 0
            quantitySelector.style.display = 'none';
            addButton.style.display = 'flex';
            await removeFromCart(productId);
            return;
        }
    }

    // Update cart in database
    try {
        const response = await fetch('/cart/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId,
                quantity: newQuantity
            })
        });

        const data = await response.json();

        if (data.success) {
            quantitySpan.textContent = newQuantity;
            updateCartCount(data.cartCount);
            
            // Show appropriate notification
            if (isIncrement) {
                showCartNotification('Quantity increased');
            } else {
                showCartNotification('Quantity decreased');
            }

            if (window.location.pathname.includes('/cart')) {
                updateCartUI(data.cart);
            }
        } else {
            throw new Error(data.message || 'Failed to update quantity');
        }
    } catch (error) {
        showErrorNotification(error.message);
        // Revert quantity on error
        quantitySpan.textContent = currentQuantity;
    }
}

async function updateCartQuantity(productId, newQuantity) {
    if (isProcessing) return;

    // Check maximum quantity limit first
    

    isProcessing = true;
    const currentQty = parseInt(document.querySelector(`.cart-item[data-product-id="${productId}"] .qty-value`).textContent);

    try {
        const response = await fetch('/cart/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId,
                quantity: newQuantity
            })
        });

        const data = await response.json();

        if (data.success) {
            if (newQuantity === 0) {
                await removeFromCart(productId);
                return;
            }

            const qtyElement = document.querySelector(`.cart-item[data-product-id="${productId}"] .qty-value`);
            if (qtyElement) {
                qtyElement.textContent = newQuantity;
            }

            updateCartCount(data.cartCount);
            updateCartSummary(data.cart);
            showCartNotification(newQuantity > currentQty ? 'Quantity increased' : 'Quantity decreased');
          
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        showErrorNotification(error.message);
    } finally {
        isProcessing = false;
    }
}

// Add to cart
async function addToCart(productId) {
    if (isProcessing) return;
    isProcessing = true;

    try {
        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId,
                quantity: 1
            })
        });

        const data = await response.json();

        if (data.success) {
            updateCartCount(data.cartCount);
            showCartNotification('Added to cart');
        } else {
            throw new Error(data.message || 'Failed to add to cart');
        }
    } catch (error) {
        showErrorNotification(error.message);
    } finally {
        isProcessing = false;
    }
}

// Remove from cart
async function removeFromCart(productId) {
    if (isProcessing) return;
    isProcessing = true;

    try {
        const response = await fetch(`/cart/remove/${productId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            updateCartCount(data.cartCount);
            
            if (window.location.pathname.includes('/cart')) {
                const cartItem = document.querySelector(`.cart-item[data-product-id="${productId}"]`);
                if (cartItem) {
                    cartItem.style.opacity = '0';
                    cartItem.style.transform = 'translateX(-20px)';
                    setTimeout(() => {
                        cartItem.remove();
                        updateCartSummary(data.cart);
                        checkEmptyCart();
                    }, 300);
                }
            }
            showCartNotification('Item removed from cart');
        } else {
            throw new Error(data.message || 'Failed to remove item');
        }
    } catch (error) {
        showErrorNotification(error.message);
    } finally {
        isProcessing = false;
    }
}

// Clear cart
async function clearCart() {
    const result = await Swal.fire({
        title: 'Clear Cart?',
        text: "This will remove all items from your cart",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, clear it'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch('/cart/clear', {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                window.location.reload();
            } else {
                throw new Error(data.message || 'Failed to clear cart');
            }
        } catch (error) {
            showErrorNotification(error.message);
        }
    }
}

// UI Update Functions
function updateCartCount(count) {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = count;
        cartCount.classList.add('count-update');
        setTimeout(() => cartCount.classList.remove('count-update'), 300);
    }
}

function updateCartSummary(cart) {
    if (!cart) return;

    // Update subtotal
    const subtotalElement = document.querySelector('.summary-item span:last-child');
    if (subtotalElement) {
        subtotalElement.textContent = `₹${cart.total.toFixed(2)}`;
    }

    // Update discount
    const discountElement = document.querySelector('.summary-item.discount span:last-child');
    if (discountElement && cart.total - cart.discountTotal > 0) {
        discountElement.textContent = `-₹${(cart.total - cart.discountTotal).toFixed(2)}`;
    }

    // Update total
    const totalElement = document.querySelector('.summary-total span:last-child');
    if (totalElement) {
        totalElement.textContent = `₹${cart.discountTotal.toFixed(2)}`;
    }

    // Update item count
    const itemCountElement = document.querySelector('.item-count');
    if (itemCountElement) {
        itemCountElement.textContent = `${cart.items.length} items`;
    }
}

function checkEmptyCart() {
    if (document.querySelectorAll('.cart-item').length === 0) {
        window.location.reload();
    }
}

// Notifications
function showCartNotification(message) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
    });

    Toast.fire({
        icon: 'success',
        title: message
    });
}

function showErrorNotification(message) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });

    Toast.fire({
        icon: 'error',
        title: message
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Handle quantity buttons in product listing
    document.querySelectorAll('.add-to-cart-wrapper').forEach(wrapper => {
        const productId = wrapper.dataset.productId;
        if (!productId) return;

        const plusBtn = wrapper.querySelector('.qty-btn.plus');
        const minusBtn = wrapper.querySelector('.qty-btn.minus');

        if (plusBtn && minusBtn) {
            plusBtn.addEventListener('click', () => handleQuantity(plusBtn, true, productId));
            minusBtn.addEventListener('click', () => handleQuantity(minusBtn, false, productId));
        }
    });

    // Handle quantity buttons in cart page
    if (window.location.pathname.includes('/cart')) {
        document.querySelectorAll('.cart-item').forEach(item => {
            const productId = item.dataset.productId;
            const plusBtn = item.querySelector('.qty-btn.plus');
            const minusBtn = item.querySelector('.qty-btn.minus');
            const qtyValue = item.querySelector('.qty-value');

            if (plusBtn && minusBtn && qtyValue) {
                plusBtn.addEventListener('click', () => {
                    const currentQty = parseInt(qtyValue.textContent);
                    if (currentQty < 10) {
                        updateCartQuantity(productId, currentQty + 1);
                    }
                });

                minusBtn.addEventListener('click', () => {
                    const currentQty = parseInt(qtyValue.textContent);
                    if (currentQty > 1) {
                        updateCartQuantity(productId, currentQty - 1);
                    } else {
                        removeFromCart(productId);
                    }
                });
            }
        });
    }
});