let staffList = [];

async function loadStaff() {
    const listEl = document.getElementById("staff-list");
    try {
        const response = await fetch('/api/admin/staff');
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
        const response = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
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

document.addEventListener("DOMContentLoaded", loadStaff);
