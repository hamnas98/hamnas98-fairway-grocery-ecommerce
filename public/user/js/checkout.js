let appliedCoupon = null;


document.addEventListener('DOMContentLoaded', function() {
   document.querySelectorAll('input[name="deliveryAddress"]').forEach(radio => {
       radio.addEventListener('change', function() {
           document.querySelectorAll('.address-card').forEach(card => {
               card.classList.remove('selected');
           });
           this.closest('.address-card').classList.add('selected');
       });
   });

   document.getElementById('showCouponsBtn').addEventListener('click', showAvailableCoupons);
});

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
       const currentTotal = document.getElementById('finalAmount').textContent;
       const response = await fetch('/apply-coupon', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ 
               code,
               cartTotal: parseFloat(currentTotal)
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
           document.getElementById('finalAmount').textContent = data.finalAmount.toFixed(2);
           
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
   document.getElementById('finalAmount').textContent = cart.discountTotal.toFixed(2);
   
   const applyBtn = document.querySelector('.apply-coupon-btn');
   applyBtn.textContent = 'Apply';
   applyBtn.onclick = applyCoupon;
   
   showSuccessNotification('Coupon removed');
}

async function placeOrder() {
   if (isProcessing) return;

   const selectedAddress = document.querySelector('input[name="deliveryAddress"]:checked');
   const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');

   if (!selectedAddress) {
       showErrorNotification('Please select a delivery address');
       return;
   }

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

       const orderData = {
           addressId: selectedAddress.value,
           paymentMethod: selectedPayment.value,
           couponCode: appliedCoupon?.code
       };

       if (selectedPayment.value === 'cod') {
           await handleCODPayment(orderData, orderBtn, originalText);
       } else {
           await handleRazorpayPayment(orderData, orderBtn, originalText);
       }
   } catch (error) {
       showErrorNotification(error.message);
       resetOrderButton(orderBtn, originalText);
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
                           orderId: data.orderId,
                           couponCode: orderData.couponCode
                       })
                   });

                   const verifyData = await verifyResponse.json();
                   if (verifyData.success) {
                       showOrderSuccess(); // Changed from showPaymentSuccess
                   } else {
                       throw new Error(verifyData.message);
                   }
               } catch (error) {
                   handlePaymentError(error);
                   resetOrderButton(orderBtn, originalText);
               }
           },
           modal: {
               ondismiss: async function() {
                   await handlePaymentCancel(orderBtn, originalText);
               }
           },
           theme: { color: '#2E3192' }
       };

       const rzp = new Razorpay(options);
       rzp.on('payment.failed', function(response) {
           handlePaymentError(response.error);
           resetOrderButton(orderBtn, originalText);
       });
       
       rzp.open();
   } catch (error) {
       handlePaymentError(error);
       resetOrderButton(orderBtn, originalText);
       throw error;
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
       window.location.href = '/dashboard/orders';
   });
}

function handlePaymentError(error) {
   showErrorNotification(error.message || 'Payment failed');
}

async function handlePaymentCancel(orderBtn, originalText) {
   try {
       await fetch('/cancel-payment', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' }
       });
       resetOrderButton(orderBtn, originalText);
       showErrorNotification('Payment cancelled');
   } catch (error) {
       console.error('Error cancelling payment:', error);
   }
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

window.onbeforeunload = function() {
   if (isProcessing) {
       return "Order is being processed. Are you sure you want to leave?";
   }
};