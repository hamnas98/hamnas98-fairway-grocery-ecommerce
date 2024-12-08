const FORGOT_VALIDATION_RULES = {
    email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Enter valid email address"
    },
    password: {
        pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        message: "Password must be 8+ characters with letters, numbers and special character"
    }
};

document.addEventListener('DOMContentLoaded', function() {
    initializeForgotPassword();
    initializeForgotOTP();
    initializeResetPassword();
});

function initializeForgotPassword() {
    const forgotForm = document.getElementById('forgotPasswordForm');
    if (!forgotForm) return;
    forgotForm.addEventListener('submit', handleForgotSubmit);
}

async function handleForgotSubmit(e) {
    e.preventDefault();
    clearErrors();

    const email = this.querySelector('[name="email"]').value;
    if (!FORGOT_VALIDATION_RULES.email.pattern.test(email)) {
        showError(this.querySelector('[name="email"]'), FORGOT_VALIDATION_RULES.email.message);
        return;
    }

    try {
        const response = await fetch('/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById('forgotFields').style.display = 'none';
            document.getElementById('forgotOtpFields').style.display = 'block';
            startForgotOTPTimer();
            document.querySelector('#forgotOtpFields .otp-input').focus();
        }
        showForgotMessage(data.message);
    } catch (error) {
        console.error('Error:', error);
        showForgotMessage('Something went wrong. Please try again.');
    }
}

function initializeForgotOTP() {
    const otpInputs = document.querySelectorAll('#forgotOtpFields .otp-input');
    
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

    const resendBtn = document.getElementById('forgotResendBtn');
    if (resendBtn) {
        resendBtn.addEventListener('click', handleForgotResendOTP);
    }
}

async function verifyForgotOTP() {
    const otp = Array.from(document.querySelectorAll('#forgotOtpFields .otp-input'))
        .map(input => input.value)
        .join('');

    try {
        const response = await fetch('/verify-forgot-password-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp })
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById('forgotOtpFields').style.display = 'none';
            document.getElementById('resetFields').style.display = 'block';
        }
        showForgotMessage(data.message);
    } catch (error) {
        console.error('Error:', error);
        showForgotMessage('Failed to verify OTP');
    }
}

async function handleForgotResendOTP(e) {
    e.preventDefault();
    const email = document.querySelector('#forgotPasswordForm [name="email"]').value;
    
    try {
        const response = await fetch('/resend-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'login',
                email: email
            })
        });;

        const data = await response.json();
        if (data.success) {
            document.getElementById('forgotResendBtn').style.display = 'none';
            document.getElementById('forgotTimer').style.display = 'block';
            startForgotOTPTimer();
        }
        showForgotMessage(data.message);
    } catch (error) {
        console.error('Error:', error);
        showForgotMessage('Failed to resend OTP');
    }
}

function startForgotOTPTimer() {
    let timeLeft = 30;
    const timer = document.getElementById('forgotTimer');
    const countdown = document.getElementById('forgotCountdown');
    const resendBtn = document.getElementById('forgotResendBtn');

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

function initializeResetPassword() {
    const resetForm = document.getElementById('resetPasswordForm');
    if (!resetForm) return;
    resetForm.addEventListener('submit', handleResetPassword);
}

async function handleResetPassword(e) {
    e.preventDefault();
    clearErrors();

    const password = this.querySelector('[name="password"]').value;
    const confirmPassword = this.querySelector('[name="confirmPassword"]').value;

    if (!FORGOT_VALIDATION_RULES.password.pattern.test(password)) {
        showError(this.querySelector('[name="password"]'), FORGOT_VALIDATION_RULES.password.message);
        return;
    }

    if (password !== confirmPassword) {
        showError(this.querySelector('[name="confirmPassword"]'), 'Passwords do not match');
        return;
    }

    try {
        const response = await fetch('/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await response.json();
        if (data.success) {
            showForgotMessage('Password reset successful');
            setTimeout(() => {
                $('#forgotPasswordModal').modal('hide');
                $('#loginModal').modal('show');
            }, 1500);
        } else {
            showForgotMessage(data.message);
        }
    } catch (error) {
        console.error(error);
        showForgotMessage('Failed to reset password');
    }
}

function showForgotMessage(message) {
    const msgElement = document.querySelector('#forgotPasswordModal .auth-message');
    msgElement.textContent = message;
    msgElement.classList.add('show');
    setTimeout(() => msgElement.classList.remove('show'), 3000);
}