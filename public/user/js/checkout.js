

// Handle address selection
document.addEventListener('DOMContentLoaded', function() {
    // Address selection
    document.querySelectorAll('input[name="deliveryAddress"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.querySelectorAll('.address-card').forEach(card => {
                card.classList.remove('selected');
            });
            this.closest('.address-card').classList.add('selected');
        });
    });
});

// Main place order function
async function placeOrder() {
    if (isProcessing) return;

    // Validate selections
    const selectedAddress = document.querySelector('input[name="deliveryAddress"]:checked');
    if (!selectedAddress) {
        showErrorNotification('Please select a delivery address');
        return;
    }

    const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
    if (!selectedPayment) {
        showErrorNotification('Please select a payment method');
        return;
    }

    try {
        isProcessing = true;
        const orderBtn = document.querySelector('.place-order-btn');
        const originalText = orderBtn.innerHTML;
        orderBtn.innerHTML = '<i class="uil uil-spinner-alt"></i> Processing...';
        orderBtn.disabled = true;

        if (selectedPayment.value === 'cod') {
            await handleCODPayment(selectedAddress.value, orderBtn, originalText);
        } else {
            await handleRazorpayPayment(selectedAddress.value, orderBtn, originalText);
        }
    } catch (error) {
        showErrorNotification(error.message);
        resetOrderButton(orderBtn, originalText);
    }
}

// Handle COD payment
async function handleCODPayment(addressId, orderBtn, originalText) {
    try {
        const response = await fetch('/place-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                addressId,
                paymentMethod: 'cod'
            })
        });

        const data = await response.json();
        if (data.success) {
            showOrderSuccess();
        } else {
            throw new Error(data.message || 'Failed to place order');
        }
    } catch (error) {
        throw error;
    }
}

// Handle Razorpay payment
async function handleRazorpayPayment(addressId, orderBtn, originalText) {
    try {
        const response = await fetch('/create-razorpay-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ addressId })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to initialize payment');
        }

        const options = {
            key: data.razorpayKey,
            amount: data.amount,
            currency: data.currency,
            order_id: data.orderId,
            name: 'Fairway Supermarket',
            description: 'Order Payment',
            prefill: {
                name: data.userInfo.name,
                email: data.userInfo.email,
                contact: data.userInfo.phone
            },
            handler: async function(response) {
                try {
                    orderBtn.innerHTML = '<i class="uil uil-spinner-alt"></i> Verifying Payment...';
                    
                    const verifyResponse = await fetch('/verify-payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            orderId: data.orderId
                        })
                    });

                    const verifyData = await verifyResponse.json();
                    if (verifyData.success) {
                        // First show the success notification
                        Swal.fire({
                            icon: 'success',
                            title: 'Payment Successful!',
                            text: 'Your order has been placed successfully',
                            confirmButtonText: 'View Order',
                            allowOutsideClick: false
                        }).then((result) => {
                            window.location.href = '/dashboard/orders';
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Payment Failed',
                            text: verifyData.message || 'Failed to verify payment',
                            confirmButtonText: 'OK'
                        });
                        resetOrderButton(orderBtn, originalText);
                    }
                } catch (error) {
                    console.error('Payment verification error:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Payment Verification Failed',
                        text: 'There was an error verifying your payment',
                        confirmButtonText: 'OK'
                    });
                    resetOrderButton(orderBtn, originalText);
                }
            },
            modal: {
                ondismiss: function() {
                    resetOrderButton(orderBtn, originalText);
                    Swal.fire({
                        icon: 'warning',
                        title: 'Payment Cancelled',
                        text: 'You have cancelled the payment',
                        confirmButtonText: 'OK'
                    });
                }
            },
            theme: {
                color: '#2E3192'
            }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response){
            Swal.fire({
                icon: 'error',
                title: 'Payment Failed',
                text: response.error.description,
                confirmButtonText: 'OK'
            });
            resetOrderButton(orderBtn, originalText);
        });
        
        rzp.open();

    } catch (error) {
        console.error('Razorpay initialization error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Payment Initialization Failed',
            text: error.message || 'Failed to initialize payment',
            confirmButtonText: 'OK'
        });
        resetOrderButton(orderBtn, originalText);
        throw error;
    }
}

// Utility functions
function showOrderSuccess() {
    Swal.fire({
        icon: 'success',
        title: 'Order Placed Successfully!',
        text: 'Thank you for shopping with us',
        confirmButtonText: 'View Order',
        allowOutsideClick: false
    }).then((result) => {
        window.location.href = '/dashboard/orders';
    });
}

function resetOrderButton(button, originalText) {
    button.innerHTML = originalText;
    button.disabled = false;
    isProcessing = false;
}

function showSuccessNotification(message) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
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

// Handle page reload/navigation
window.onbeforeunload = function() {
    if (isProcessing) {
        return "Order is being processed. Are you sure you want to leave?";
    }
};