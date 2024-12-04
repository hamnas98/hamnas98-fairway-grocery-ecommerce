// Show OTP Modal after successful signup
function showOtpModal() {
    const signupModal = bootstrap.Modal.getInstance(document.getElementById('signupModal'));
    const otpModal = new bootstrap.Modal(document.getElementById('otpModal'));
    
    signupModal.hide();
    otpModal.show();
}

document.addEventListener('DOMContentLoaded', function() {
    // Password toggle functionality
    document.querySelectorAll('.auth-pass-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('uil-eye-slash');
                icon.classList.add('uil-eye');
            } else {
                input.type = 'password';
                icon.classList.remove('uil-eye');
                icon.classList.add('uil-eye-slash');
            }
        });
    });

    // OTP input handling
    const otpInputs = document.querySelectorAll('.auth-otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            if (this.value.length === 1) {
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            }
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value) {
                if (index > 0) {
                    otpInputs[index - 1].focus();
                }
            }
        });
    });
});