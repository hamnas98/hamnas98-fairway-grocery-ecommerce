const SIGNUP_VALIDATION_RULES = {
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
    },
    referralCode: {
        pattern: /^[A-Z0-9]{8}$/,
        message: "Invalid referral code format",
        optional: true // Makes this field optional
    }
 };
 
 document.addEventListener('DOMContentLoaded', function() {
    initializeSignupForm();
    initializeOTPHandling();
 });
 
 function initializeSignupForm() {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    const referralInput = signupForm.querySelector('[name="referralCode"]');
    if (referralInput) {
        referralInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    }
 
    signupForm.addEventListener('submit', handleSignupSubmit);
 }
 
 async function handleSignupSubmit(e) {
    e.preventDefault();
    clearErrors();
 
    if (!validateSignupForm(this)) return;
 
    const formData = {
        name: this.querySelector('[name="name"]').value,
        email: this.querySelector('[name="email"]').value,
        phone: this.querySelector('[name="phone"]').value,
        password: this.querySelector('[name="password"]').value,
        referralCode: this.querySelector('[name="referralCode"]').value.trim() || null
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
            document.querySelector('.auth-message').textContent = data.message;
            document.querySelector('.auth-message').classList.add('show');
            setTimeout(() => {
                document.querySelector('.auth-message').classList.remove('show');
            }, 3000);
        }
    } catch (error) {
        console.error('Error:', error);
    }
 }
 
 function validateSignupForm(form) {
    let isValid = true;
    
    for (const field in SIGNUP_VALIDATION_RULES) {
        const input = form.querySelector(`[name="${field}"]`);
        if (!input) continue;
        
        if (!SIGNUP_VALIDATION_RULES[field].pattern.test(input.value)) {
            if(SIGNUP_VALIDATION_RULES[field].optional && !input.value) {
                continue;
            }
            showError(input, SIGNUP_VALIDATION_RULES[field].message);
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
 
 function initializeOTPHandling() {
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
    const resendBtn = document.getElementById('resendBtn');
    if (resendBtn) {
        resendBtn.addEventListener('click', handleResendOTP);
    }
 }
 
 async function handleResendOTP(e) {
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
            document.getElementById('resendBtn').style.display = 'none';
            document.getElementById('timer').style.display = 'block';
            startOTPTimer();
        }
        if (data.message) {
            document.querySelector('.auth-message').textContent = data.message;
            document.querySelector('.auth-message').classList.add('show');
            setTimeout(() => {
                document.querySelector('.auth-message').classList.remove('show');
            }, 3000);
        }
    } catch (error) {
        console.error('Error:', error);
    }
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
        }
        if (data.message) {
            document.querySelector('.auth-message').textContent = data.message;
            document.querySelector('.auth-message').classList.add('show');
            setTimeout(() => {
                document.querySelector('.auth-message').classList.remove('show');
            }, 3000);
        }
    })
    .catch(error => console.error('Error:', error));
 }