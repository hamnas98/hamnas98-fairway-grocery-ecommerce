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