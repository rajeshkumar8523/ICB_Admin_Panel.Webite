// register.js
function togglePassword(fieldId) {
    const passwordField = document.getElementById(fieldId);
    const eyeIcon = passwordField.nextElementSibling;

    if (passwordField.type === "password") {
        passwordField.type = "text";
        eyeIcon.textContent = "🙈";
    } else {
        passwordField.type = "password";
        eyeIcon.textContent = "👁️";
    }
}

// Role options based on institution type
const roleOptions = {
    college: [
        { value: 'principal', label: 'Principal' },
        { value: 'vice_principal', label: 'Vice Principal' },
        { value: 'transport_incharge', label: 'Transport Incharge' },
        { value: 'professor', label: 'Professor' },
        { value: 'staff', label: 'Staff' }
    ]
};

// Update role options based on selected institution type
function updateRoles() {
    const institutionType = document.getElementById('institutionType').value;
    const roleSelect = document.getElementById('designation');
    
    // Clear existing options
    roleSelect.innerHTML = '<option value="">Select Designation</option>';
    
    if (institutionType) {
        // Add new options based on institution type
        roleOptions[institutionType].forEach(role => {
            const option = document.createElement('option');
            option.value = role.value;
            option.textContent = role.label;
            roleSelect.appendChild(option);
        });
    }
}

// Handle Form Submission
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById("userId").value;
    const name = document.getElementById("name").value;
    const contact = document.getElementById("contact").value;
    const email = document.getElementById("email").value;
    const institutionType = document.getElementById("institutionType").value;
    const designation = document.getElementById("designation").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const errorMessage = document.getElementById("error-message");
    const successMessage = document.getElementById("success-message");

    errorMessage.textContent = "";
    successMessage.textContent = "";
    successMessage.style.display = "none";

    // Password match validation
    if (newPassword !== confirmPassword) {
        errorMessage.textContent = "Passwords do not match!";
        return;
    }

    // Determine API base URL based on environment
    const API_BASE_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5005'
        : 'https://icb-admin-panel-website-projectsvercel-lb0t7hchw.vercel.app';

    try {
        // Sending data to the server
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                name,
                contact,
                email,
                institutionType,
                designation,
                password: newPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        successMessage.textContent = "Registration successful! Redirecting to login...";
        successMessage.style.display = "block";

        // Redirect to login after 2 seconds
        setTimeout(() => {
            window.location.href = "../STUDENTLOGIN/studentlogin.html";
        }, 2000);
    } catch (error) {
        errorMessage.textContent = error.message;
    }
});

// Initialize role options when institution type changes
document.getElementById('institutionType').addEventListener('change', updateRoles);