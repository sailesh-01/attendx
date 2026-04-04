const API_URL = "/api";

const defaultBatch = { prefix: "ES", year: "24", dept: "AD", deptName: "AI & DS" };
const savedBatch = JSON.parse(localStorage.getItem("attendx_batch"));
const BATCH = savedBatch || defaultBatch;

const CUSTOM_COLS = JSON.parse(localStorage.getItem("attendx_custom_cols") || "[]");

// Shared State
let CURRENT_YEAR = parseInt(localStorage.getItem("attendx_current_year")) || 2;
let CURRENT_SECTION = localStorage.getItem("attendx_current_section") || "A";
let allStudents = [];

const getPrefix = () => `${BATCH.prefix}${BATCH.year}${BATCH.dept}`;
const rollNo = s => `${getPrefix()}${s}`;

async function fetchStudents(year = CURRENT_YEAR) {
    try {
        const section = CURRENT_SECTION;
        console.log(`fetchStudents called for year ${year}, section ${section}...`);
        const response = await fetch(`${API_URL}/students?year=${year}&section=${section}`);
        console.log(`fetchStudents response status: ${response.status}`);
        let data = await response.json();
        data.forEach(s => {
            if (s.custom_data && typeof s.custom_data === 'string') {
                try { s.custom_data = JSON.parse(s.custom_data); } catch(e) { s.custom_data = {}; }
            } else if (!s.custom_data) {
                s.custom_data = {};
            }
        });
        allStudents = data;
        console.log(`fetchStudents JSON parsed. Count: ${allStudents.length}`);
        return allStudents;
    } catch (error) {
        console.error("Failed to fetch students:", error);
        return [];
    }
}

async function saveAttendanceRecords(records) {
    try {
        const response = await fetch(`${API_URL}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(records)
        });
        return await response.json();
    } catch (error) {
        console.error("Failed to save attendance:", error);
        return { success: false };
    }
}

async function fetchAttendance(date, year = CURRENT_YEAR) {
    try {
        const section = CURRENT_SECTION;
        const response = await fetch(`${API_URL}/attendance?date=${date}&year=${year}&section=${section}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch attendance:", error);
        return [];
    }
}

async function fetchAttendanceSummary(year = CURRENT_YEAR) {
    try {
        const section = CURRENT_SECTION;
        const response = await fetch(`${API_URL}/attendance/summary?year=${year}&section=${section}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch attendance summary:", error);
        return [];
    }
}

async function apiSaveStudent(data) {
    try {
        const response = await fetch(`${API_URL}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error("Failed to save student:", error);
        return { error: true };
    }
}

async function apiUpdateStudent(id, data) {
    try {
        const response = await fetch(`${API_URL}/students/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error("Failed to update student:", error);
        return { error: true };
    }
}

async function apiDeleteStudent(id) {
    try {
        const response = await fetch(`${API_URL}/students/${id}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        console.error("Failed to delete student:", error);
        return { error: true };
    }
}

async function apiDeleteAllStudents() {
    try {
        await fetch(`${API_URL}/students`, { method: 'DELETE' });
        return { success: true };
    } catch (error) {
        return { error: true };
    }
}

async function fetchMarks(year, examType) {
    try {
        const section = CURRENT_SECTION;
        const response = await fetch(`${API_URL}/marks?year=${year}&section=${section}&exam_type=${examType}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch marks:", error);
        return [];
    }
}

async function saveMarksRecords(records) {
    try {
        const response = await fetch(`${API_URL}/marks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(records)
        });
        return await response.json();
    } catch (error) {
        console.error("Failed to save marks:", error);
        return { error: true };
    }
}

// Helper to update year
function setGlobalYear(year) {
    CURRENT_YEAR = parseInt(year);
    localStorage.setItem("attendx_current_year", CURRENT_YEAR);
}

document.addEventListener("DOMContentLoaded", () => {
    const loggedStaff = localStorage.getItem("attendx_logged_staff");
    if (loggedStaff) {
        // Enforce the current year for this staff
        // Disable year selects if they exist
        const yearSelect = document.getElementById("year-select");
        const yearFilter = document.getElementById("year-filter");
        const fYear = document.getElementById("f-year");
        const fSection = document.getElementById("f-section");
        
        [yearSelect, yearFilter, fYear, fSection].forEach(el => {
            if (el) {
                const targetVal = el === fSection ? CURRENT_SECTION : CURRENT_YEAR;
                
                // Ensure option exists
                let hasOption = Array.from(el.options).some(opt => opt.value == targetVal);
                if (!hasOption) {
                    const opt = document.createElement("option");
                    opt.value = targetVal;
                    opt.text = el === fSection ? `Class ${targetVal}` : `${targetVal}th Year`;
                    el.appendChild(opt);
                }
                
                el.value = targetVal;

                // SPECIAL: Don't lock for ADMIN
                if (loggedStaff !== 'ADMIN') {
                    el.disabled = true;
                    el.title = `Locked to this class for ${loggedStaff}`;
                    el.style.opacity = '0.7';
                    el.style.cursor = 'not-allowed';
                }
            }
        });
        
        // Show staff ID in the navigation if possible
        const nav = document.querySelector('nav');
        if (nav && !document.getElementById('staff-badge')) {
            const logoutBtn = nav.querySelector('.nav-logout');
            const initials = loggedStaff.substring(0, 2).toUpperCase();
            
            const profileContainer = document.createElement('div');
            profileContainer.className = 'staff-profile-container';
            const isAdm = loggedStaff === 'ADMIN';
            profileContainer.innerHTML = `
                <div id="staff-badge" class="staff-profile-chip ${isAdm ? 'chip-admin' : ''}">
                    <div class="staff-avatar" style="${isAdm ? 'background:linear-gradient(135deg, #f59e0b, #ef4444)' : ''}">${initials}</div>
                    <div class="staff-details">
                        <span class="staff-name">${loggedStaff.toUpperCase()}</span>
                        <span class="staff-role">${isAdm ? 'ADMINISTRATOR' : 'STAFF'}</span>
                    </div>
                    <span class="staff-class-pill">${isAdm ? 'FULL ACCESS' : `CLASS ${CURRENT_YEAR}-${CURRENT_SECTION}`}</span>
                </div>
                <div id="staff-dropdown" class="staff-dropdown">
                    <div class="dropdown-header">
                        <div class="dropdown-user">${loggedStaff}</div>
                        <div class="dropdown-meta-group">
                            <div class="staff-advisor-badge">${isAdm ? 'System Administrator' : 'Academic Advisor'}</div>
                            <div class="staff-join-date">Session 2024-25</div>
                        </div>
                    </div>
                    <div class="dropdown-stats">
                        <div class="dropdown-meta">Batch ${CURRENT_YEAR}${CURRENT_SECTION} • Today</div>
                        <h4>Today's Summary</h4>
                        <div class="stats-grid">
                            <div class="mini-stat">
                                <span class="mini-stat-label">Present</span>
                                <span class="mini-stat-val val-p" id="prof-p">--</span>
                            </div>
                            <div class="mini-stat">
                                <span class="mini-stat-label">Absent</span>
                                <span class="mini-stat-val val-a" id="prof-a">--</span>
                            </div>
                        </div>
                        <div class="status-row">
                            <span class="mini-stat-label">System Status</span>
                            <div class="pending-count">
                                <div class="pending-pulse"></div>
                                <span id="prof-pending">--</span> Pending
                            </div>
                        </div>
                    </div>
                    
                    <div class="staff-trend-section">
                        <h4>
                            <span>Attendance Trend</span>
                            <span style="font-family:var(--mono); color:var(--text); opacity:0.5; font-size:9px;">5D</span>
                        </h4>
                        <div class="staff-trend-chart" id="prof-trend">
                            <div class="trend-bar" style="height:20%"></div>
                            <div class="trend-bar" style="height:40%"></div>
                            <div class="trend-bar" style="height:80%"></div>
                            <div class="trend-bar" style="height:60%"></div>
                            <div class="trend-bar" style="height:90%"></div>
                        </div>
                    </div>

                    <div class="dropdown-actions">
                        <div class="dropdown-item" id="btn-ch-pass">
                            <span>🔑</span> Change Password
                        </div>
                        <a href="index.html" class="dropdown-item logout-item">
                            <span>🚪</span> Logout
                        </a>
                    </div>
                </div>
            `;
            
            // Move dropdown to body to avoid nav clipping on mobile
            const dropdown = profileContainer.querySelector('.staff-dropdown');
            document.body.appendChild(dropdown);
            
            if (logoutBtn) {
                nav.insertBefore(profileContainer, logoutBtn);
                logoutBtn.remove();
            } else {
                nav.appendChild(profileContainer);
            }

            // Dropdown Toggle & Overlay
            const chip = profileContainer.querySelector('.staff-profile-chip');
            const dropElement = document.getElementById('staff-dropdown');
            
            // Create overlay if not exists
            let overlay = document.querySelector('.dropdown-overlay');
            if(!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'dropdown-overlay';
                document.body.appendChild(overlay);
            }
            
            const toggleDropdown = (state) => {
                if (!dropElement || !overlay) return;
                const isActive = state !== undefined ? state : !dropElement.classList.contains('active');
                dropElement.classList.toggle('active', isActive);
                overlay.classList.toggle('active', isActive);
                if (isActive) fetchProfileStats();
            };

            chip.addEventListener('click', (e) => {
                if (e.target.closest('.staff-logout-btn')) return;
                toggleDropdown();
            });

            overlay.addEventListener('click', () => toggleDropdown(false));

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!profileContainer.contains(e.target) && !overlay.contains(e.target)) {
                    toggleDropdown(false);
                }
            });

            // Change Password Modal Trigger
            const chPassBtn = dropElement.querySelector('#btn-ch-pass');
            if (chPassBtn) {
                chPassBtn.addEventListener('click', () => {
                    toggleDropdown(false);
                    showPasswordModal();
                });
            }
        }
    }

    async function fetchProfileStats() {
        try {
            // 1. Fetch Today's Counts
            const today = new Date().toISOString().split('T')[0];
            const resToday = await fetch(`${API_URL}/attendance?date=${today}&year=${CURRENT_YEAR}&section=${CURRENT_SECTION}`);
            const dataToday = await resToday.json();
            
            const pCount = dataToday.filter(r => r.status === 'P').length;
            const aCount = dataToday.filter(r => r.status === 'A').length;
            const markedCount = dataToday.length;
            
            document.getElementById('prof-p').textContent = pCount;
            document.getElementById('prof-a').textContent = aCount;
            
            // 2. Calculate Pending (Total Students - Marked Today)
            const totalStudents = allStudents.length;
            const pending = Math.max(0, totalStudents - markedCount);
            document.getElementById('prof-pending').textContent = pending;

            // 3. Fetch 5-Day Trend
            const resSummary = await fetch(`${API_URL}/attendance/summary?year=${CURRENT_YEAR}&section=${CURRENT_SECTION}`);
            const summary = await resSummary.json();
            
            // Get last 5 unique dates
            const dates = [...new Set(summary.map(r => r.date))].sort().slice(-5);
            const trendContainer = document.getElementById('prof-trend');
            trendContainer.innerHTML = '';
            
            dates.forEach(d => {
                const dayRecords = summary.filter(r => r.date === d);
                const dayP = dayRecords.filter(r => r.status === 'P').length;
                const percent = (dayP / totalStudents) * 100;
                
                const bar = document.createElement('div');
                bar.className = 'trend-bar';
                bar.style.height = `${Math.max(5, percent)}%`;
                bar.title = `${d}: ${Math.round(percent)}% Present`;
                trendContainer.appendChild(bar);
            });

            // Fill empty bars if less than 5 days
            while (trendContainer.children.length < 5) {
                const filler = document.createElement('div');
                filler.className = 'trend-bar';
                filler.style.height = '5%';
                filler.style.opacity = '0.2';
                trendContainer.prepend(filler);
            }

        } catch (e) { console.error("Stats fail", e); }
    }

    function showPasswordModal() {
        let modal = document.getElementById('pass-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'pass-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-card">
                    <span class="close-modal">&times;</span>
                    <h2>Update Security</h2>
                    <div class="input-group">
                        <label>Current Password</label>
                        <input type="password" id="m-old-pass" class="input-field" placeholder="••••••••">
                    </div>
                    <div class="input-group">
                        <label>New Password</label>
                        <input type="password" id="m-new-pass" class="input-field" placeholder="At least 4 chars">
                    </div>
                    <div id="m-error" style="color:var(--red); font-size:12px; margin-top:10px; display:none;"></div>
                    <div class="modal-footer">
                        <button class="btn" id="m-save-pass" style="background:var(--accent);">Update Password</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('.close-modal').addEventListener('click', () => {
                document.body.classList.remove('modal-active');
            });

            modal.querySelector('#m-save-pass').addEventListener('click', async () => {
                const oldP = document.getElementById('m-old-pass').value;
                const newP = document.getElementById('m-new-pass').value;
                const errEl = document.getElementById('m-error');
                
                if (newP.length < 4) {
                    errEl.textContent = "Minimal 4 characters required.";
                    errEl.style.display = 'block';
                    return;
                }

                try {
                    const res = await fetch('/api/change-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            username: localStorage.getItem('attendx_logged_staff'),
                            oldPassword: oldP,
                            newPassword: newP
                        })
                    });
                    const result = await res.json();
                    if (res.ok) {
                        alert("Password successfully updated. Please login again.");
                        localStorage.clear();
                        window.location.href = 'index.html';
                    } else {
                        errEl.textContent = result.error || "Update failed.";
                        errEl.style.display = 'block';
                    }
                } catch (e) {
                    errEl.textContent = "Server error. Try again.";
                    errEl.style.display = 'block';
                }
            });
        }
        
        document.body.classList.add('modal-active');
    }
});
