let staffList = [];

async function loadStaff() {
    const listEl = document.getElementById("staff-list");
    try {
        const response = await fetch('/api/admin/staff?adminUser=ADMIN');
        staffList = await response.json();
        
        // Exclude ADMIN account from listing
        const adminFiltered = staffList.filter(s => s.username !== 'ADMIN');
        renderStaff(adminFiltered);
    } catch (e) {
        console.error("Failed to load staff:", e);
        listEl.innerHTML = `<div class="empty-state">❌ Failed to load registry.</div>`;
    }
}

function renderStaff(list) {
    const listEl = document.getElementById("staff-list");
    listEl.innerHTML = "";
    
    if (list.length === 0) {
        listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><p>No staff accounts registered yet.</p></div>`;
        return;
    }
    
    list.forEach(s => {
        const card = document.createElement("div");
        card.className = "staff-card";
        card.innerHTML = `
            <div class="staff-info">
                <h3>${s.username}</h3>
                <div class="staff-meta">
                    <span class="meta-tag">Y: ${s.assign_year}</span>
                    <span class="meta-tag">S: ${s.assign_section}</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-edit" style="margin-right:8px; padding:8px 16px; border-radius:8px; font-size:13px; cursor:pointer;" onclick="openEditModal('${s.id}')">Edit credentials</button>
                <button class="btn-delete" onclick="removeStaff('${s.id}', '${s.username}')">Remove Access</button>
            </div>
        `;
        listEl.appendChild(card);
    });
}

document.getElementById("staff-search").oninput = (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = staffList.filter(s => s.username.toLowerCase().includes(q) && s.username !== 'ADMIN');
    renderStaff(filtered);
};

async function removeStaff(id, username) {
    if (!confirm(`Are you sure you want to PERMANENTLY remove access for "${username}"?`)) return;
    
    try {
        const response = await fetch(`/api/admin/staff/${id}`, { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminUser: 'ADMIN' })
        });
        if (response.ok) {
            toast(`"${username}" access revoked`, "amber");
            loadStaff();
        } else {
            toast("Failed to remove staff", "red");
        }
    } catch (e) {
        toast("Connection error", "red");
    }
}

function toast(msg, color="green") {
    const t = document.getElementById("toast");
    const m = document.getElementById("tmsg");
    if(!t || !m) return;
    m.textContent = msg;
    const d=t.querySelector(".tdot");
    const c={"green":"#25D366","amber":"#f59e0b","red":"#ef4444"}[color]||"#25D366";
    if(d) d.style.background=c;
    t.classList.add("show");
    setTimeout(()=>t.classList.remove("show"), 2800);
}


// Modal Logic
function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('show');
    document.body.classList.add('modal-active');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('show');
    // Only remove modal-active if no other modals are showing
    if (!document.querySelector('.modal-overlay.show')) {
        document.body.classList.remove('modal-active');
    }
}

// Add Staff
document.getElementById('btn-add-staff').onclick = () => {
    document.getElementById('add-username').value = "";
    document.getElementById('add-password').value = "";
    document.getElementById('add-error').style.display = 'none';
    openModal('add-staff-modal');
};

document.getElementById('save-new-staff').onclick = async () => {
    const username = document.getElementById('add-username').value.trim();
    const password = document.getElementById('add-password').value.trim();
    const year = document.getElementById('add-year').value;
    const section = document.getElementById('add-section').value;
    const errEl = document.getElementById('add-error');

    if (!username || !password) {
        errEl.textContent = "Please fill all fields.";
        errEl.style.display = 'block';
        return;
    }

    if (password.length < 4) {
        errEl.textContent = "Password must be at least 4 characters.";
        errEl.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/admin/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, year, section, adminUser: 'ADMIN' })
        });
        const result = await response.json();
        if (response.ok) {
            toast(`Staff "${username}" created successfully`);
            closeModal('add-staff-modal');
            loadStaff();
        } else {
            errEl.textContent = result.error || "Failed to create staff.";
            errEl.style.display = 'block';
        }
    } catch (e) {
        errEl.textContent = "Connection error.";
        errEl.style.display = 'block';
    }
};

// Edit Staff
function openEditModal(id) {
    // Ensure id is compared correctly (Supabase IDs are usually strings/UUIDs)
    const staff = staffList.find(s => String(s.id) === String(id));
    console.log("Opening edit modal for:", id, staff);

    if (!staff) {
        toast("Staff member not found in local registry recorded. Please refresh.", "red");
        return;
    }

    document.getElementById('edit-id').value = staff.id;
    document.getElementById('edit-username').value = staff.username || "";
    document.getElementById('edit-password').value = "";
    document.getElementById('edit-year').value = staff.assign_year || 1;
    document.getElementById('edit-section').value = staff.assign_section || "A";
    document.getElementById('edit-error').style.display = 'none';
    openModal('edit-staff-modal');
}

document.getElementById('update-staff').onclick = async () => {
    const id = document.getElementById('edit-id').value;
    const username = document.getElementById('edit-username').value.trim();
    const password = document.getElementById('edit-password').value.trim();
    const year = document.getElementById('edit-year').value;
    const section = document.getElementById('edit-section').value;
    const errEl = document.getElementById('edit-error');

    if (!username) {
        errEl.textContent = "Username is required.";
        errEl.style.display = 'block';
        return;
    }

    const payload = { username, year, section, adminUser: 'ADMIN' };
    if (password) {
        if (password.length < 4) {
            errEl.textContent = "New password must be at least 4 characters.";
            errEl.style.display = 'block';
            return;
        }
        payload.password = password;
    }

    try {
        const response = await fetch(`/api/admin/staff/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (response.ok) {
            toast(`Staff "${username}" updated`);
            closeModal('edit-staff-modal');
            loadStaff();
        } else {
            errEl.textContent = result.error || "Failed to update staff.";
            errEl.style.display = 'block';
        }
    } catch (e) {
        errEl.textContent = "Connection error.";
        errEl.style.display = 'block';
    }
};


// Initial load (Already handled by listener below but ensuring single point of entry)
document.addEventListener("DOMContentLoaded", () => {
    loadStaff();
});
