// Wishlist Notification Functions
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
            element.classList.toggle('liked');
            showWishlistNotification(data.message);
        } else {
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

                    const countElement = document.querySelector('.item-count');
                    const currentCount = parseInt(countElement.textContent);
                    if (currentCount === 1) {
                        location.reload();
                    } else {
                        countElement.textContent = `${currentCount - 1} items`;
                    }

                    showWishlistNotification('Product removed from wishlist');
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