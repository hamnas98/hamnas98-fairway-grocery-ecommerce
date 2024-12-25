
function openEditModal() {
    const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
    modal.show();
}

function validateForm() {
    const form = document.getElementById('editProfileForm');
    const name = document.getElementById('editName');
    const email = document.getElementById('editEmail');
    const phone = document.getElementById('editPhone');
    
    // Reset previous validations
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    
    let isValid = true;

    // Name validation
    if (!name.value.trim()) {
        name.classList.add('is-invalid');
        document.getElementById('nameError').textContent = 'Name is required';
        isValid = false;
    } else if (name.value.length < 3 || name.value.length > 50) {
        name.classList.add('is-invalid');
        document.getElementById('nameError').textContent = 'Name must be between 3 and 50 characters';
        isValid = false;
    } else if (!/^[a-zA-Z ]+$/.test(name.value.trim())) {
        name.classList.add('is-invalid');
        document.getElementById('nameError').textContent = 'Name can only contain letters and spaces';
        isValid = false;
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email.value.trim()) {
        email.classList.add('is-invalid');
        document.getElementById('emailError').textContent = 'Email is required';
        isValid = false;
    } else if (!emailRegex.test(email.value.trim())) {
        email.classList.add('is-invalid');
        document.getElementById('emailError').textContent = 'Please enter a valid email address';
        isValid = false;
    }

    // Phone validation
    if (!phone.value.trim()) {
        phone.classList.add('is-invalid');
        document.getElementById('phoneError').textContent = 'Phone number is required';
        isValid = false;
    } else if (!/^[0-9]{10}$/.test(phone.value.trim())) {
        phone.classList.add('is-invalid');
        document.getElementById('phoneError').textContent = 'Please enter a valid 10-digit phone number';
        isValid = false;
    }

    return isValid;
}

async function updateProfile() {
    try {
        if (!validateForm()) {
            return;
        }

        const form = document.getElementById('editProfileForm');
        const formData = {
            name: document.getElementById('editName').value.trim(),
            email: document.getElementById('editEmail').value.trim(),
            phone: document.getElementById('editPhone').value.trim()
        };
        
        const response = await fetch('/dashboard/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Profile updated successfully',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                window.location.reload();
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Failed to update profile'
            });
        }
    } catch (error) {
        console.error('Update profile error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Something went wrong. Please try again.'
        });
    }
}

// Real-time phone number validation
document.getElementById('editPhone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 10) value = value.slice(0, 10);
    e.target.value = value;
    
    // Show/hide validation message in real-time
    if (value.length === 10) {
        this.classList.remove('is-invalid');
    }
});

// Real-time name validation
document.getElementById('editName').addEventListener('input', function(e) {
    this.value = this.value.replace(/[^a-zA-Z ]/g, '');
    if (this.value.trim().length >= 3) {
        this.classList.remove('is-invalid');
    }
});

// Email validation on input
document.getElementById('editEmail').addEventListener('input', function() {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailRegex.test(this.value.trim())) {
        this.classList.remove('is-invalid');
    }
});

function openResetPasswordModal() {
const modal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
modal.show();
}

// Password validation function
function validatePassword(password) {
const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password)
};

// Update validation indicators
document.getElementById('lengthCheck').style.color = checks.length ? 'green' : 'red';
document.getElementById('upperCheck').style.color = checks.uppercase ? 'green' : 'red';
document.getElementById('numberCheck').style.color = checks.number ? 'green' : 'red';
document.getElementById('specialCheck').style.color = checks.special ? 'green' : 'red';

return checks.length && checks.uppercase && checks.number && checks.special;
}

function validatePasswordForm() {
const form = document.getElementById('resetPasswordForm');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');

form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
let isValid = true;

// New password validation
if (!newPassword.value) {
    newPassword.classList.add('is-invalid');
    document.getElementById('newPasswordError').textContent = 'Password is required';
    isValid = false;
} else if (!validatePassword(newPassword.value)) {
    newPassword.classList.add('is-invalid');
    document.getElementById('newPasswordError').textContent = 'Password does not meet requirements';
    isValid = false;
}

// Confirm password validation
if (!confirmPassword.value) {
    confirmPassword.classList.add('is-invalid');
    document.getElementById('confirmPasswordError').textContent = 'Please confirm your password';
    isValid = false;
} else if (confirmPassword.value !== newPassword.value) {
    confirmPassword.classList.add('is-invalid');
    document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
    isValid = false;
}

return isValid;
}

async function resetPassword() {
try {
    if (!validatePasswordForm()) {
        return;
    }

    const formData = {
        newPassword: document.getElementById('newPassword').value,
        confirmPassword: document.getElementById('confirmPassword').value
    };
    
    const response = await fetch('/dashboard/reset-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Password reset successfully',
            showConfirmButton: false,
            timer: 1500
        }).then(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal'));
            modal.hide();
            document.getElementById('resetPasswordForm').reset();
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: data.message || 'Failed to reset password'
        });
    }
} catch (error) {
    console.error('Reset password error:', error);
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Something went wrong. Please try again.'
    });
}
}

// Real-time password validation
document.getElementById('newPassword').addEventListener('input', function() {
validatePassword(this.value);
});

// Real-time confirm password validation
document.getElementById('confirmPassword').addEventListener('input', function() {
if (this.value === document.getElementById('newPassword').value) {
    this.classList.remove('is-invalid');
}
});

// Clear form on modal close
document.getElementById('resetPasswordModal').addEventListener('hidden.bs.modal', function () {
document.getElementById('resetPasswordForm').reset();
document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
document.querySelectorAll('ul li').forEach(el => el.style.color = ''); // Reset validation indicators
});

