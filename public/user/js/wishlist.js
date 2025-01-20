// Wishlist Notification Functions
function updateWishlistCount(change) {
    const countElement = document.getElementById('wishlistCount');
    if (countElement) {
        const currentCount = parseInt(countElement.textContent) || 0;
        // change will be 1 for addition, -1 for removal
        const newCount = currentCount + change;
        countElement.textContent = newCount;
    }
}

function showWishlistNotification(message) {
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

function showWishlistError(message) {
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

// Updated toggleWishlistItem function
function toggleWishlistItem(element, productId) {
    fetch('/wishlist/toggle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (data.inWishlist) {
                element.className = 'like-icon liked';
                updateWishlistCount(1);
            } else {
                element.className = 'like-icon';
                updateWishlistCount(-1);
            }
            showWishlistNotification(data.message);
        } else {
            // This will now show "Please login to manage wishlist" when user is not logged in
            showWishlistError(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showWishlistError('Failed to update wishlist');
    });
}

// Updated removeFromWishlist function
function removeFromWishlist(productId) {
    Swal.fire({
        title: 'Remove from Wishlist?',
        text: 'Are you sure you want to remove this item from your wishlist?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it!'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/wishlist/remove/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const productCard = document.querySelector(`[data-product-id="${productId}"]`).closest('.col-xl-3');
                    productCard.remove();
                    updateWishlistCount(-1); // Decrement count
                    showWishlistNotification('Product removed from wishlist');
                    
                    // Reload if wishlist is empty
                    const countElement = document.getElementById('wishlistCount');
                    if (countElement && parseInt(countElement.textContent) === 0) {
                        location.reload();
                    }
                } else {
                    showWishlistError(data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showWishlistError('Failed to remove item from wishlist');
            });
        }
    });
}