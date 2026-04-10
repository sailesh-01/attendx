(function() {
    // Immediate execution to prevent flash of wrong theme
    const savedTheme = localStorage.getItem("attendx_theme") || "dark";
    if (savedTheme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
    }
})();

document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("attendx_theme") || "dark";
    
    function toggleTheme(btn) {
        const current = document.documentElement.getAttribute("data-theme");
        if (current === "light") {
            document.documentElement.removeAttribute("data-theme");
            localStorage.setItem("attendx_theme", "dark");
            btn.innerHTML = "☀️";
        } else {
            document.documentElement.setAttribute("data-theme", "light");
            localStorage.setItem("attendx_theme", "light");
            btn.innerHTML = "🌙";
        }
    }

    const nav = document.querySelector("nav");
    if (nav) {
        const themeBtn = document.createElement("button");
        themeBtn.className = "theme-toggle-btn";
        themeBtn.innerHTML = savedTheme === "light" ? "🌙" : "☀️";
        themeBtn.title = "Toggle Light/Dark Theme";
        
        // Find place to insert
        const logout = nav.querySelector(".staff-profile-container") || nav.querySelector(".nav-logout");
        if (logout) {
            nav.insertBefore(themeBtn, logout);
        } else {
            nav.appendChild(themeBtn);
        }
        
        themeBtn.addEventListener("click", () => toggleTheme(themeBtn));
    } else {
        // Floating button if no nav
        const floatBtn = document.createElement("button");
        floatBtn.className = "theme-toggle-btn floating-theme-btn";
        floatBtn.innerHTML = savedTheme === "light" ? "🌙" : "☀️";
        floatBtn.title = "Toggle Light/Dark Theme";
        document.body.appendChild(floatBtn);
        floatBtn.addEventListener("click", () => toggleTheme(floatBtn));
    }
});
