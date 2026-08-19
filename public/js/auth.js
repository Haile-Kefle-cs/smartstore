// Authentication JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to dashboard
    if (localStorage.getItem('authToken')) {
        window.location.href = '/';
        return;
    }
    
    const loginForm = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-alert');
    const loginBtn = document.getElementById('login-btn');
    const passwordToggle = document.getElementById('password-toggle');
    
    // Password visibility toggle
    passwordToggle?.addEventListener('click', () => {
        const passwordInput = document.getElementById('password');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordToggle.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            passwordToggle.textContent = '👁️';
        }
    });
    
    // Handle login form submission
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me')?.checked;
        
        // Show loading state
        loginBtn.disabled = true;
        loginBtn.querySelector('.btn-loader').style.display = 'inline-block';
        errorDiv.style.display = 'none';
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }
            
            // Store auth data
            if (rememberMe) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
            } else {
                sessionStorage.setItem('authToken', data.token);
                sessionStorage.setItem('currentUser', JSON.stringify(data.user));
            }
            
            // Redirect to main app
            window.location.href = '/';
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        } finally {
            loginBtn.disabled = false;
            loginBtn.querySelector('.btn-loader').style.display = 'none';
        }
    });
});

// Fill demo credentials
function fillCredentials(email, password) {
    document.getElementById('email').value = email;
    document.getElementById('password').value = password;
}