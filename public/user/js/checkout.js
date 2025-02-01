let appliedCoupon = null;
let useWallet = false;
let walletAmountToUse = 0;
let originalTotal = 0;

document.addEventListener('DOMContentLoaded', function() {
    // Existing event listeners
    document.querySelectorAll('input[name="deliveryAddress"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.querySelectorAll('.address-card').forEach(card => {
                card.classList.remove('selected');
            });
            this.closest('.address-card').classList.add('selected');
        });

           // Store original amount on page load
    const finalAmountSpan = document.getElementById('finalAmount');
    if (finalAmountSpan) {
        originalAmount = parseFloat(finalAmountSpan.textContent);
    }
    // Initial check for COD availability
    handlePaymentMethodDisplay();
    });

    document.getElementById('showCouponsBtn').addEventListener('click', showAvailableCoupons);

    const walletCheckbox = document.getElementById('useWallet');
    if (walletCheckbox) {
        walletCheckbox.addEventListener('change', handleWalletChange);
    }

    // Store original total and discount total on page load
    const cartTotalInput = document.getElementById('cartTotal');
    if (cartTotalInput) {
        originalTotal = parseFloat(cartTotalInput.getAttribute('data-discount-total'));
    }
});

function handlePaymentMethodDisplay() {
    const finalAmount = parseFloat(document.getElementById('finalAmount').textContent);
    const codInput = document.getElementById('cod');
    const codLabel = document.querySelector('label[for="cod"]');
    const codStatusTag = codLabel.querySelector('.status-tag');

    if (finalAmount > 500) {
        codInput.disabled = true;
        codInput.checked = false;
        codStatusTag.textContent = 'Not Available';
        codStatusTag.classList.add('unavailable');
        if (codInput.checked) {
            document.getElementById('razorpay').checked = true;
        }
        
        // Add tooltip or message explaining why COD is not available
        codLabel.setAttribute('title', 'COD is not available for orders above ₹500');
    } else {
        codInput.disabled = false;
        codStatusTag.textContent = 'Available';
        codStatusTag.classList.remove('unavailable');
        codLabel.removeAttribute('title');
    }
}


function updateTotalAmount() {
    const finalAmountSpan = document.getElementById('finalAmount');
    let currentTotal = originalAmount;

    // Apply coupon discount if exists
    if (appliedCoupon) {
        currentTotal -= appliedCoupon.discount;
    }

    // Apply wallet amount if checked
    if (useWallet) {
        const walletBalance = parseFloat(document.getElementById('walletBalance').value);
        if (walletBalance >= currentTotal) {
            walletAmountToUse = currentTotal;
            currentTotal = 0;
        } else {
            walletAmountToUse = walletBalance;
            currentTotal -= walletBalance;
        }
        document.getElementById('walletAmount').textContent = walletAmountToUse.toFixed(2);
    }

    finalAmountSpan.textContent = currentTotal.toFixed(2);

  // Update payment methods visibility and COD availability
  const paymentMethodsDiv = document.querySelector('.payment-methods');
  if (paymentMethodsDiv) {
      paymentMethodsDiv.style.display = currentTotal === 0 ? 'none' : 'block';
      if (currentTotal > 0) {
          handlePaymentMethodDisplay();
      }
  }
}


function showAvailableCoupons() {
   const couponsModal = new bootstrap.Modal(document.getElementById('availableCouponsModal'));
   couponsModal.show();
}

function selectCoupon(code) {
   document.getElementById('couponInput').value = code;
   bootstrap.Modal.getInstance(document.getElementById('availableCouponsModal')).hide();
   applyCoupon();
}

async function applyCoupon() {
    const code = document.getElementById('couponInput').value.trim().toUpperCase();
    if (!code) {
        showErrorNotification('Please enter a coupon code');
        return;
    }
   
    try {
        const response = await fetch('/apply-coupon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                code,
                cartTotal: originalAmount
            })
        });

        const data = await response.json();

        if (data.success) {
            appliedCoupon = {
                code,
                discount: data.discount
            };
           
            document.getElementById('couponDiscount').style.display = 'flex';
            document.getElementById('couponDiscountAmount').textContent = data.discount.toFixed(2);
            
            updateTotalAmount();
            
            showSuccessNotification('Coupon applied! You saved ₹' + data.discount.toFixed(2));
           
            const applyBtn = document.querySelector('.apply-coupon-btn');
            document.getElementById('couponInput').disabled = true;
            applyBtn.textContent = 'Remove';
            applyBtn.onclick = removeCoupon;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        showErrorNotification(error.message || 'Failed to apply coupon');
    }
}

function removeCoupon() {
    appliedCoupon = null;
   
    document.getElementById('couponInput').value = '';
    document.getElementById('couponInput').disabled = false;
    document.getElementById('couponDiscount').style.display = 'none';
    
    updateTotalAmount();
   
    const applyBtn = document.querySelector('.apply-coupon-btn');
    applyBtn.textContent = 'Apply';
    applyBtn.onclick = applyCoupon;
   
    showSuccessNotification('Coupon removed');
}

function handleWalletChange(event) {
    useWallet = event.target.checked;
    const walletDiscountDiv = document.getElementById('walletDiscount');

    if (useWallet) {
        walletDiscountDiv.style.display = 'flex';
    } else {
        walletAmountToUse = 0;
        walletDiscountDiv.style.display = 'none';
    }

    updateTotalAmount();
}

async function placeOrder() {
    if (isProcessing) return;

    const selectedAddress = document.querySelector('input[name="deliveryAddress"]:checked');
    const finalAmount = parseFloat(document.getElementById('finalAmount').textContent);
    
    if (!selectedAddress) {
        showErrorNotification('Please select a delivery address');
        return;
    }
 
    // Check payment method only if wallet doesn't cover full amount
    const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
    if (finalAmount > 0 && !selectedPayment) {
        showErrorNotification('Please select a payment method');
        return;
    }
    // Add COD amount validation
 if (selectedPayment?.value === 'cod' && finalAmount > 500) {
    showErrorNotification('COD is not available for orders above ₹500');
    return;
}
   

    try {
        isProcessing = true;
        const orderBtn = document.querySelector('.place-order-btn');
        const originalText = orderBtn.innerHTML;
        orderBtn.innerHTML = '<i class="uil uil-spinner-alt"></i> Processing...';
        orderBtn.disabled = true;

        const orderData = {
            addressId: selectedAddress.value,
            paymentMethod: finalAmount === 0 ? 'wallet' : selectedPayment.value,
            couponCode: appliedCoupon?.code,
            useWallet,
            walletAmount: walletAmountToUse
        };

        if (finalAmount === 0) {
            await handleWalletOnlyPayment(orderData, orderBtn, originalText);
        } else if (selectedPayment.value === 'cod') {
            await handleCODPayment(orderData, orderBtn, originalText);
        } else {
            await handleRazorpayPayment(orderData, orderBtn, originalText);
        }
   } catch (error) {
       showErrorNotification(error.message);
       resetOrderButton(orderBtn, originalText);
   }
}

async function handleWalletOnlyPayment(orderData, orderBtn, originalText) {
    try {
        const response = await fetch('/place-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
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

async function handleCODPayment(orderData, orderBtn, originalText) {
   try {
       const response = await fetch('/place-order', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(orderData)
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

async function handleRazorpayPayment(orderData, orderBtn, originalText) {
    try {
        const response = await fetch('/create-razorpay-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
 
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message);
        }
 
        // Store order data for later use
        window.currentOrderData = {
            ...orderData,
            mongoOrderId: data.mongoOrderId
        };
 
        const options = {
            key: data.razorpayKey,
            amount: data.amount,
            currency: data.currency,
            order_id: data.orderId,
            name: 'Fairway Supermarket',
            description: 'Order Payment',
            prefill: data.userInfo,
            handler: async function(response) {
                try {
                    orderBtn.innerHTML = '<i class="uil uil-spinner-alt"></i> Verifying Payment...';
                    
                    const verifyResponse = await fetch('/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...response,
                            orderId: data.mongoOrderId,
                            razorpay_order_id: data.orderId,
                            couponCode: orderData.couponCode,
                            useWallet: orderData.useWallet,
                            walletAmount: orderData.walletAmount
                        })
                    });
 
                    const verifyData = await verifyResponse.json();
                    if (verifyData.success) {
                        showOrderSuccess();
                    } else {
                        throw new Error(verifyData.message);
                    }
                } catch (error) {
                    await handlePaymentError(error, data.mongoOrderId);
                    resetOrderButton(orderBtn, originalText);
                }
            },
            modal: {
                ondismiss: async function() {
                    // Only handle cancellation if no payment error occurred
                    if (!window.paymentErrorOccurred) {
                        await handlePaymentCancel(orderBtn, originalText, data.mongoOrderId);
                    }
                    window.paymentErrorOccurred = false; // Reset the flag
                }
            },
            theme: { color: '#2E3192' }
        };
 
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', async function(response) {
            window.paymentErrorOccurred = true; // Set flag to prevent cancel handler
            await handlePaymentError(response.error, data.mongoOrderId);
            resetOrderButton(orderBtn, originalText);
        });
        
        rzp.open();
    } catch (error) {
        handlePaymentError(error);
        resetOrderButton(orderBtn, originalText);
        throw error;
    }
}

async function handlePaymentError(error, orderId) {
    try {
        window.paymentErrorOccurred = true; // Set flag to prevent cancel handler

        if (orderId) {
            await fetch('/update-payment-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    status: 'payment_pending'
                })
            });
        }
 
        Swal.fire({
            icon: 'error',
            title: 'Payment Failed',
            text: 'Your order has been saved. You can complete the payment from your orders page.',
            confirmButtonText: 'View Orders',
            showCancelButton: true,
            cancelButtonText: 'Close'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '/dashboard/orders';
            }
        });
    } catch (err) {
        showErrorNotification(error.message || 'Payment failed');
    }
}

async function handlePaymentCancel(orderBtn, originalText, orderId) {
    try {
        // Don't proceed if payment error occurred
        if (window.paymentErrorOccurred) {
            return;
        }

        const orderData = window.currentOrderData;
        
        if (!orderId && orderData?.mongoOrderId) {
            orderId = orderData.mongoOrderId;
        }

        await fetch('/cancel-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                useWallet: orderData?.useWallet,
                walletAmount: orderData?.walletAmount,
                orderId: orderId
            })
        });
 
        window.currentOrderData = null;
        resetOrderButton(orderBtn, originalText);
        showErrorNotification('Payment cancelled');
        
        // Delete order and redirect to cart
        if (orderId) {
            await fetch('/delete-pending-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });
        }

        setTimeout(() => {
            window.location.href = '/cart';
        }, 1500);
    } catch (error) {
        console.error('Error cancelling payment:', error);
        showErrorNotification('Error cancelling payment');
    } finally {
        window.paymentErrorOccurred = false; // Reset the flag
    }
}
 
 function showOrderSuccess() {
     Swal.fire({
         icon: 'success',
         title: 'Order Placed Successfully!',
         text: 'Thank you for shopping with us',
         confirmButtonText: 'View Order',
         allowOutsideClick: false
     }).then(() => {
         window.currentOrderData = null; // Clear stored data
         window.location.href = '/dashboard/orders';
     });
 }
 
//for payemnt continue on from orders page
 async function continuePayment(orderId) {
    try {
        const response = await fetch('/continue-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message);
        }

        const options = {
            key: data.razorpayKey,
            amount: data.amount,
            currency: data.currency,
            order_id: data.orderId,
            name: 'Fairway Supermarket',
            description: 'Complete Payment',
            prefill: data.userInfo,
            handler: async function(response) {
                try {
                    const verifyResponse = await fetch('/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...response,
                            orderId: data.orderId
                        })
                    });

                    const verifyData = await verifyResponse.json();
                    if (verifyData.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Payment Completed!',
                            text: 'Your payment has been processed successfully',
                            confirmButtonText: 'OK'
                        }).then(() => {
                            window.location.reload();
                        });
                    } else {
                        throw new Error(verifyData.message);
                    }
                } catch (error) {
                    showErrorNotification(error.message || 'Payment verification failed');
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function(response) {
            showErrorNotification(response.error.description || 'Payment failed');
        });
        
        rzp.open();
    } catch (error) {
        showErrorNotification(error.message || 'Failed to initialize payment');
    }
}


async function handlePaymentCancel(orderBtn, originalText, orderId) {
    try {
        const orderData = window.currentOrderData;
        await fetch('/cancel-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                useWallet: orderData?.useWallet,
                walletAmount: orderData?.walletAmount,
                orderId: orderId
            })
        });
 
        window.currentOrderData = null; // Clear stored data
        resetOrderButton(orderBtn, originalText);
        showErrorNotification('Payment cancelled');
        
        // Reload page to reset the state
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (error) {
        console.error('Error cancelling payment:', error);
    }
 }

function resetOrderButton(button, originalText) {
   button.innerHTML = originalText;
   button.disabled = false;
   isProcessing = false;
}

async function cancelPendingOrder(orderId) {
    try {
        // Show confirmation dialog
        const result = await Swal.fire({
            title: 'Cancel Order?',
            text: 'Are you sure you want to cancel this order?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, cancel it!',
            cancelButtonText: 'No, keep it'
        });

        if (!result.isConfirmed) {
            return;
        }

        // Send request to delete pending order
        const response = await fetch('/delete-pending-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId })
        });

        const data = await response.json();

        if (data.success) {
            Swal.fire({
                title: 'Order Cancelled',
                text: 'Your order has been cancelled successfully.',
                icon: 'success'
            }).then(() => {
                // Reload the page to update the orders list
                window.location.reload();
            });
        } else {
            throw new Error(data.message || 'Failed to cancel order');
        }
    } catch (error) {
        Swal.fire({
            title: 'Error',
            text: error.message || 'Failed to cancel order',
            icon: 'error'
        });
    }
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

window.onbeforeunload = function() {
   if (isProcessing) {
       return "Order is being processed. Are you sure you want to leave?";
   }
};