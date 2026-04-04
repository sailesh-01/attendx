// Clear existing session on login page load
localStorage.removeItem('attendx_logged_staff');
localStorage.removeItem('attendx_current_year');

document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value.trim();
  const err = document.getElementById('error-msg');
  const btn = document.getElementById('login-btn');
  const box = document.getElementById('login-box');
  
  err.style.opacity = '0';
  
  if (!user || !pass) {
    err.textContent = "Please enter both username and password.";
    err.style.opacity = '1';
    return;
  }

  // Loading state
  btn.classList.add('btn-loading');
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    
    const result = await response.json();
    btn.classList.remove('btn-loading');
    
    if (response.ok) {
      // Success sliding animation
      box.classList.add('container-success');
      localStorage.setItem('attendx_logged_staff', result.username);
      localStorage.setItem('attendx_current_year', result.assign_year);
      localStorage.setItem('attendx_current_section', result.assign_section);
      
      // Wait for animation to finish then redirect
      setTimeout(() => {
        window.location.href = 'attendance.html';
      }, 800);
    } else {
      // Error
      err.textContent = result.error || "Incorrect username or password.";
      err.style.opacity = '1';
      
      // Shake effect
      box.style.transform = 'translateY(0) translateX(-10px)';
      setTimeout(() => box.style.transform = 'translateY(0) translateX(10px)', 100);
      setTimeout(() => box.style.transform = 'translateY(0) translateX(-10px)', 200);
      setTimeout(() => box.style.transform = 'translateY(0) translateX(0)', 300);
    }
  } catch (error) {
    btn.classList.remove('btn-loading');
    err.textContent = "Network error. Is server running?";
    err.style.opacity = '1';
  }
});
