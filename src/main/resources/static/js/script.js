// ========== API CONFIGURATION ==========
const API_BASE_URL = 'http://localhost:8080';

// ========== TOAST NOTIFICATION ==========
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ========== INLINE ALERT MESSAGE ==========
function showLoginAlert(message, type) {
    // Remove any existing alert
    const existing = document.getElementById('loginAlertMsg');
    if (existing) existing.remove();

    const alert = document.createElement('div');
    alert.id = 'loginAlertMsg';
    alert.className = `login-alert login-alert-${type}`;

    let icon = '';
    if (type === 'error') icon = '⚠️';
    else if (type === 'success') icon = '✅';
    else if (type === 'warning') icon = '⏳';
    else if (type === 'info') icon = 'ℹ️';

    alert.innerHTML = `
        <span class="login-alert-icon">${icon}</span>
        <span class="login-alert-text">${message}</span>
        <button class="login-alert-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    // Insert alert at the top of the visible form
    const loginBox = document.querySelector('.login-box');
    const signupBox = document.querySelector('.signup-box');
    const targetBox = (signupBox && signupBox.style.display !== 'none') ? signupBox : loginBox;
    if (targetBox) {
        const heading = targetBox.querySelector('h2');
        if (heading) {
            heading.insertAdjacentElement('afterend', alert);
        } else {
            targetBox.prepend(alert);
        }
    }

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.classList.add('login-alert-fadeout');
            setTimeout(() => alert.remove(), 400);
        }
    }, 6000);
}

// ========== TOGGLE BETWEEN LOGIN & SIGNUP ==========
function showSignup() {
    const loginBox = document.querySelector('.login-box');
    const signupBox = document.querySelector('.signup-box');
    if (loginBox) loginBox.style.display = 'none';
    if (signupBox) signupBox.style.display = 'block';
}

function showLogin() {
    const loginBox = document.querySelector('.login-box');
    const signupBox = document.querySelector('.signup-box');
    if (loginBox) loginBox.style.display = 'block';
    if (signupBox) signupBox.style.display = 'none';
}

// ========== HANDLE LOGIN ==========
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showLoginAlert('Please enter both email and password.', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            sessionStorage.setItem('userId', data.userId);
            sessionStorage.setItem('userName', data.name);
            sessionStorage.setItem('userRole', data.role);
            
            showLoginAlert(`Welcome back, ${data.name}! Redirecting...`, 'success');
            
            setTimeout(() => {
                switch(data.role) {
                    case 'HR':
                        window.location.href = '/pages/hr-dashboard.html';
                        break;
                    case 'MANAGER':
                        window.location.href = '/pages/manager-dashboard.html';
                        break;
                    case 'EMPLOYEE':
                        window.location.href = '/pages/employee-dashboard.html';
                        break;
                    case 'CLIENT':
                        window.location.href = '/pages/client-dashboard.html';
                        break;
                    default:
                        showLoginAlert('Invalid role assigned to your account.', 'error');
                }
            }, 1000);
        } else {
            // Show specific user-friendly error messages
            const errMsg = data.error || data.message || '';
            if (errMsg.includes('User not found')) {
                showLoginAlert('No account found with this email address. Please check your email or sign up.', 'error');
            } else if (errMsg.includes('Invalid password')) {
                showLoginAlert('Incorrect password. Please try again.', 'error');
            } else if (errMsg.includes('not active') && errMsg.includes('PENDING')) {
                showLoginAlert('Your account is pending HR approval. You will receive an email with login credentials once approved.', 'warning');
            } else if (errMsg.includes('TERMINATED')) {
                showLoginAlert('Your account has been terminated. Please contact HR for assistance.', 'error');
            } else {
                showLoginAlert(errMsg || 'Login failed. Please try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginAlert('Unable to connect to server. Please make sure the backend is running.', 'error');
    }
});

// ========== HANDLE SIGNUP ==========
document.getElementById('signupForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('signupName').value);
    formData.append('email', document.getElementById('signupEmail').value);
    formData.append('phone', document.getElementById('signupPhone').value);
    formData.append('role', document.getElementById('signupRole').value);
    formData.append('qualification', document.getElementById('qualification').value);
    
    const certificateFile = document.getElementById('certificate').files[0];
    if (certificateFile) {
        if (certificateFile.size > 5 * 1024 * 1024) {
            showLoginAlert('Certificate file is too large! Maximum allowed file size is 5MB. Your file: ' + (certificateFile.size / (1024 * 1024)).toFixed(2) + 'MB.', 'error');
            return;
        }
        formData.append('certificate', certificateFile);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showLogin();
            document.getElementById('signupForm').reset();
            // Show alert on login form after switching
            setTimeout(() => {
                showLoginAlert('Signup request submitted successfully! HR will review your application. You will receive login credentials via email once approved.', 'success');
            }, 100);
        } else {
            showLoginAlert(data.message || data.error || 'Signup failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showLoginAlert('Unable to connect to server. Please try again later.', 'error');
    }
});