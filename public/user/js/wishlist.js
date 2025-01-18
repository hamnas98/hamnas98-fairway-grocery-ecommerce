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
            // Toggle active class for visual feedback
            element.classList.toggle('liked');
            showToast(data.message); // Assuming you have a toast notification function
        } else {
            showToast(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Failed to update wishlist');
    });
}