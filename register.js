document.getElementById('register-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value.trim();
  const year = document.getElementById('assign-year').value;
  const section = document.getElementById('assign-section').value;
  
  const err = document.getElementById('error-msg');
  const success = document.getElementById('success-msg');
  const btn = document.getElementById('submit-btn');
  const box = document.getElementById('login-box');
  
  err.style.opacity = '0';
  err.style.display = 'none';
  success.style.display = 'none';
  
  if (pass.length < 4) {
    err.textContent = "Password must be at least 4 characters.";
    err.style.display = 'block';
    err.style.opacity = '1';
    return;
  }

  // Loading state
  btn.classList.add('btn-loading');
  
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass, year, section })
    });
    
    const result = await response.json();
    btn.classList.remove('btn-loading');
    
    if (response.ok) {
      // Success
      success.style.display = 'block';
      box.style.border = '1px solid var(--green)';
      
      // Redirect back to login after short delay
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      // Error from server
      err.textContent = result.error || "Failed to register account.";
      err.style.display = 'block';
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
    err.style.display = 'block';
    err.style.opacity = '1';
  }
});
