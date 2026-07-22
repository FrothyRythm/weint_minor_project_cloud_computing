// Authentication page handlers for user sign up and sign in
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const toggleAuth = document.getElementById('toggle-auth');
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  const alertEl = document.getElementById('auth-alert');

  function showAlert(msg, isSuccess = false) {
    alertEl.textContent = msg;
    alertEl.className = `alert ${isSuccess ? 'alert-success' : 'alert-error'}`;
    alertEl.style.display = 'block';
  }

  if (toggleAuth) {
    toggleAuth.addEventListener('click', () => {
      if (loginSection.style.display === 'none') {
        loginSection.style.display = 'block';
        registerSection.style.display = 'none';
        toggleAuth.textContent = "Don't have an account? Register";
      } else {
        loginSection.style.display = 'none';
        registerSection.style.display = 'block';
        toggleAuth.textContent = 'Already have an account? Login';
      }
      alertEl.style.display = 'none';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = e.target.username.value;
      const password = e.target.password.value;
      try {
        await api.request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        window.location.href = '../dashboard.html';
      } catch (err) {
        showAlert(err.message);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = e.target.username.value;
      const password = e.target.password.value;
      try {
        await api.request('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        showAlert('Registration successful! You can now log in.', true);
        loginSection.style.display = 'block';
        registerSection.style.display = 'none';
        toggleAuth.textContent = "Don't have an account? Register";
      } catch (err) {
        showAlert(err.message);
      }
    });
  }
});
