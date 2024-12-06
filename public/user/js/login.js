const LOGIN_VALIDATION_RULES = {
    email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Enter valid email address"
    },
    password: {
        pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        message: "Invalid password format"
    }
};

document.addEventListener('DOMContentLoaded', function() {
    initializeLoginForm();
    initializeLoginOTP();
});

function initializeLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', handleLoginSubmit);
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    clearErrors();

    if (!validateLoginForm(this)) return;

    const formData = {
        email: this.querySelector('[name="email"]').value,
        password: this.querySelector('[name="password"]').value
    };

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById('loginFields').style.display = 'none';
            document.getElementById('loginOtpFields').style.display = 'block';
            startLoginOTPTimer();
            document.querySelector('#loginOtpFields .otp-input').focus();
        }
        if (data.message) {
            showLoginMessage(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function validateLoginForm(form) {
    let isValid = true;
    
    for (const field in LOGIN_VALIDATION_RULES) {
        const input = form.querySelector(`[name="${field}"]`);
        if (!input) continue;
        
        if (!LOGIN_VALIDATION_RULES[field].pattern.test(input.value)) {
            showError(input, LOGIN_VALIDATION_RULES[field].message);
            isValid = false;
        }
    }
    return isValid;
}

function initializeLoginOTP() {
    const otpInputs = document.querySelectorAll('#loginOtpFields .otp-input');
    
    otpInputs.forEach((input, index, inputs) => {
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

    // Initialize resend button
    const resendBtn = document.getElementById('loginResendBtn');
    if (resendBtn) {
        resendBtn.addEventListener('click', handleLoginResendOTP);
    }
}

async function handleLoginResendOTP(e) {
    e.preventDefault();
    const email = document.querySelector('#loginForm [name="email"]').value;
    
    try {
        const response = await fetch('/resend-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'login',
                email: email
            })
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById('loginResendBtn').style.display = 'none';
            document.getElementById('loginTimer').style.display = 'block';
            startLoginOTPTimer();
        }
        if (data.message) {
            showLoginMessage(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function startLoginOTPTimer() {
    let timeLeft = 30;
    const timer = document.getElementById('loginTimer');
    const countdown = document.getElementById('loginCountdown');
    const resendBtn = document.getElementById('loginResendBtn');

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

function showLoginMessage(message) {
    const msgElement = document.querySelector('#loginModal .auth-message');
    msgElement.textContent = message;
    msgElement.classList.add('show');
    setTimeout(() => msgElement.classList.remove('show'), 3000);
}

async function verifyLoginOTP() {
    const otp = Array.from(document.querySelectorAll('#loginOtpFields .otp-input'))
        .map(input => input.value)
        .join('');

    try {
        const response = await fetch('/verify-login-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp })
        });

        const data = await response.json();
        if (data.success) {
            window.location.href = data.redirectUrl;
        }
        if (data.message) {
            showLoginMessage(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}