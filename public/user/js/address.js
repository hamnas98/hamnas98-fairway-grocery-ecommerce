document.addEventListener('DOMContentLoaded', function() {
    // Mobile number validation
    document.getElementById('mobile').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) value = value.slice(0, 10);
        e.target.value = value;
        
        if (value.length === 10) {
            this.classList.remove('is-invalid');
        }
    });

    // Pincode validation
    document.getElementById('pincode').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 6) value = value.slice(0, 6);
        e.target.value = value;
        
        if (value.length === 6) {
            this.classList.remove('is-invalid');
        }
    });

    // Clear form on modal close
    document.getElementById('address_model').addEventListener('hidden.bs.modal', function() {
        document.getElementById('addressForm').reset();
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        const modalTitle = document.querySelector('#address_model .modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Add New Address';
        }
    });
});

function validateAddressForm() {
    const form = document.getElementById('addressForm');
    let isValid = true;

    // Reset previous validations
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    // Name validation
    const name = document.getElementById('name');
    if (!name.value.trim()) {
        name.classList.add('is-invalid');
        document.getElementById('nameError').textContent = 'Name is required';
        isValid = false;
    }

    // Mobile validation
    const mobile = document.getElementById('mobile');
    if (!mobile.value.trim()) {
        mobile.classList.add('is-invalid');
        document.getElementById('mobileError').textContent = 'Mobile number is required';
        isValid = false;
    } else if (!/^[0-9]{10}$/.test(mobile.value.trim())) {
        mobile.classList.add('is-invalid');
        document.getElementById('mobileError').textContent = 'Enter valid 10-digit mobile number';
        isValid = false;
    }

    // Flat/House validation
    const flat = document.getElementById('flat');
    if (!flat.value.trim()) {
        flat.classList.add('is-invalid');
        document.getElementById('flatError').textContent = 'House/Flat number is required';
        isValid = false;
    }

    // Address line validation
    const addressLine = document.getElementById('addressLine');
    if (!addressLine.value.trim()) {
        addressLine.classList.add('is-invalid');
        document.getElementById('addressLineError').textContent = 'Street address is required';
        isValid = false;
    }

    // City validation
    const city = document.getElementById('city');
    if (!city.value.trim()) {
        city.classList.add('is-invalid');
        document.getElementById('cityError').textContent = 'City is required';
        isValid = false;
    }

    // State validation
    const state = document.getElementById('state');
    if (!state.value) {
        state.classList.add('is-invalid');
        document.getElementById('stateError').textContent = 'State is required';
        isValid = false;
    }

    // Pincode validation
    const pincode = document.getElementById('pincode');
    if (!pincode.value.trim()) {
        pincode.classList.add('is-invalid');
        document.getElementById('pincodeError').textContent = 'Pincode is required';
        isValid = false;
    } else if (!/^[0-9]{6}$/.test(pincode.value.trim())) {
        pincode.classList.add('is-invalid');
        document.getElementById('pincodeError').textContent = 'Enter valid 6-digit pincode';
        isValid = false;
    }

    return isValid;
}

async function saveAddress() {
    try {
        if (!validateAddressForm()) {
            return;
        }

        const addressId = document.getElementById('addressId').value;
        const formData = {
            addressType: document.querySelector('input[name="addressType"]:checked').value,
            name: document.getElementById('name').value.trim(),
            mobile: document.getElementById('mobile').value.trim(),
            flat: document.getElementById('flat').value.trim(),
            addressLine: document.getElementById('addressLine').value.trim(),
            city: document.getElementById('city').value.trim(),
            state: document.getElementById('state').value,
            pincode: document.getElementById('pincode').value.trim(),
            isDefault: document.getElementById('isDefault').checked
        };

        const url = addressId ? `/dashboard/address/${addressId}` : '/dashboard/address';
        const method = addressId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
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
                text: addressId ? 'Address updated successfully' : 'Address added successfully',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                window.location.reload();
            });
        } else {
            throw new Error(data.message || 'Failed to save address');
        }
    } catch (error) {
        console.error('Save address error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Something went wrong. Please try again.'
        });
    }
}

async function editAddress(addressId) {
    try {
        const response = await fetch(`/dashboard/address/${addressId}`);
        const data = await response.json();

        if (data.success) {
            const address = data.address;
            
            // Set address type radio button
            const radioButton = document.querySelector(`input[name="addressType"][value="${address.addressType}"]`);
            if (radioButton) {
                radioButton.checked = true;
            }

            // Set form values
            document.getElementById('addressId').value = address._id;
            document.getElementById('name').value = address.name;
            document.getElementById('mobile').value = address.mobile;
            document.getElementById('flat').value = address.flat;
            document.getElementById('addressLine').value = address.addressLine;
            document.getElementById('city').value = address.city;
            document.getElementById('state').value = address.state;
            document.getElementById('pincode').value = address.pincode;
            document.getElementById('isDefault').checked = address.isDefault;

            // Change modal title
            const modalTitle = document.querySelector('#address_model .modal-title');
            if (modalTitle) {
                modalTitle.textContent = 'Edit Address';
            }

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('address_model'));
            modal.show();
        } else {
            throw new Error(data.message || 'Failed to load address');
        }
    } catch (error) {
        console.error('Edit address error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load address details'
        });
    }
}
async function deleteAddress(addressId) {
    try {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You want to delete this address?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            const response = await fetch(`/dashboard/address/${addressId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Address has been deleted.',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    window.location.reload();
                });
            } else {
                throw new Error(data.message || 'Failed to delete address');
            }
        }
    } catch (error) {
        console.error('Delete address error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to delete address'
        });
    }
}
async function setDefaultAddress(addressId) {
    try {
        const response = await fetch(`/dashboard/address/${addressId}/default`, {
            method: 'PUT'
        });

        const data = await response.json();

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Default address updated successfully',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                window.location.reload();
            });
        } else {
            throw new Error(data.message || 'Failed to set default address');
        }
    } catch (error) {
        console.error('Set default address error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to set default address'
        });
    }
}