const VALIDATION_RULES = {
    name: {
        pattern: /^[A-Za-z\s]{3,}$/,
        message: "Name must be 3-10 characters, letters only"
    },
    phone: {
        pattern: /^[0-9]{10}$/,
        message: "Enter valid 10-digit mobile number"
    },
    email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Enter valid email address" 
    },
    password: {
        pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        message: "Password min 8 characters with letters, numbers and special character"
    }
 };
 
 document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    
    // Password toggle
    function togglePassword(icon) {
        const input = icon.previousElementSibling;
        if (input.type === 'password') {
            input.type = 'text'; 
            icon.classList.remove('uil-eye');
            icon.classList.add('uil-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('uil-eye-slash'); 
            icon.classList.add('uil-eye');
        }
     }
 
    // Submit form
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors();
 
        if (!validateForm(this)) return;
 
        const formData = {
            name: this.querySelector('[name="name"]').value,
            email: this.querySelector('[name="email"]').value,
            phone: this.querySelector('[name="phone"]').value,
            password: this.querySelector('[name="password"]').value
        };
 
        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
 
            const data = await response.json();
            if (data.success) {
                document.getElementById('signupFields').style.display = 'none';
                document.getElementById('otpFields').style.display = 'block';
                startOTPTimer();
                document.querySelector('.otp-input').focus();
            }
            if (data.message) {
                // Flash message from backend
                document.querySelector('.auth-message').textContent = data.message;
                document.querySelector('.auth-message').classList.add('show');
                setTimeout(() => {
                    document.querySelector('.auth-message').classList.remove('show');
                }, 3000);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });

 
    // OTP input handling
    document.querySelectorAll('.otp-input').forEach((input, index, inputs) => {
        input.addEventListener('input', function() {
            if (this.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus(); 
            }
        });
 
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });
 
    // Resend OTP button
    document.getElementById('resendBtn').addEventListener('click', async function(e) {
        e.preventDefault();
        const email = document.querySelector('[name="email"]').value;
        
        try {
            const response = await fetch('/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'signup',
                    email: email
                })
            });
 
            const data = await response.json();
            if (data.success) {
                this.style.display = 'none';
                document.getElementById('timer').style.display = 'block';
                startOTPTimer();
            }
            if (data.message) {
                // Flash message from backend
                document.querySelector('.auth-message').textContent = data.message;
                document.querySelector('.auth-message').classList.add('show');
                setTimeout(() => {
                    document.querySelector('.auth-message').classList.remove('show');
                }, 3000);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
 });
 
 function validateForm(form) {
    let isValid = true;
    
    for (const field in VALIDATION_RULES) {
        const input = form.querySelector(`[name="${field}"]`);
        if (!input) continue;
        
        if (!VALIDATION_RULES[field].pattern.test(input.value)) {
            showError(input, VALIDATION_RULES[field].message);
            isValid = false;
        }
    }
 
    const password = form.querySelector('[name="password"]');
    const confirmPassword = form.querySelector('[name="confirmPassword"]');
    if (password.value !== confirmPassword.value) {
        showError(confirmPassword, "Passwords do not match");
        isValid = false;
    }
 
    return isValid;
 }
 
 function showError(input, message) {
    const formGroup = input.closest('.auth-group');
    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    formGroup.appendChild(error);
    formGroup.classList.add('error');
 }
 
 function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    document.querySelectorAll('.auth-group.error').forEach(el => el.classList.remove('error'));
    // Clear errors on input 
document.querySelectorAll('.auth-control').forEach(input => {
    input.addEventListener('input', function() {
        const formGroup = this.closest('.auth-group');
        const error = formGroup.querySelector('.error-message');
        if (error) {
            error.remove();
            formGroup.classList.remove('error');
        }
    });
 });
 }
 
 function startOTPTimer() {
    let timeLeft = 30;
    const timer = document.getElementById('timer');
    const countdown = document.getElementById('countdown');
    const resendBtn = document.getElementById('resendBtn');
 
    timer.style.display = 'block';
    resendBtn.style.display = 'none';
 
    const interval = setInterval(() => {
        timeLeft--;
        countdown.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(interval);
            timer.style.display = 'none';
            resendBtn.style.display = 'block';
        }
    }, 1000);
 }
 
 function verifyOTP() {
    const otp = Array.from(document.querySelectorAll('.otp-input'))
        .map(input => input.value)
        .join('');
 
    fetch('/verify-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = data.redirectUrl;
        }if (data.message) {
            // Flash message from backend
            document.querySelector('.auth-message').textContent = data.message;
            document.querySelector('.auth-message').classList.add('show');
            setTimeout(() => {
                document.querySelector('.auth-message').classList.remove('show');
            }, 3000);
        }
    })
    .catch(error => console.error('Error:', error));
 }