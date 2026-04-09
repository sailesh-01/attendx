const attendance = {};
const sentStatus = {};

async function initAttendance() {
    const selector = document.getElementById("year-select");
    if (selector) selector.value = CURRENT_YEAR;
    
    document.getElementById("current-date-display").textContent = new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});

    // Add Enter key support for quick apply
    ['absent-input', 'od-input'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent newline in textarea
                    applyAttendance();
                }
            });
        }
    });

    await loadData();
    initSystemStatus();
}

async function initSystemStatus() {
    const isAdmin = localStorage.getItem('attendx_logged_staff') === 'ADMIN';
    const badge = document.getElementById('system-status-badge');
    
    if (!badge) return;

    // Fetch initial status
    let currentStatus = 'Live';
    try {
        const res = await fetch('/api/system-status');
        const data = await res.json();
        currentStatus = data.status || 'Live';
        updateStatusUI(currentStatus);
    } catch (e) {
        console.error("Failed to fetch system status");
    }

    if (isAdmin) {
        badge.classList.add('status-managed');
        badge.title = "Click to change system status";
        
        const select = document.createElement('select');
        select.className = 'status-select';
        select.innerHTML = `
            <option value="Live">Live</option>
            <option value="Maintenance">On Maintenance</option>
            <option value="Stop">Stop</option>
        `;
        select.value = currentStatus;
        
        select.onchange = async (e) => {
            const newStatus = e.target.value;
            await setSystemStatus(newStatus);
        };
        
        badge.appendChild(select);
    }
}

function updateStatusUI(status) {
    const badge = document.getElementById('system-status-badge');
    const text = document.getElementById('status-text');
    const pulse = document.getElementById('status-pulse');
    
    if (!badge || !text) return;

    text.textContent = status === 'Maintenance' ? 'On Maintenance' : status;
    badge.className = 'badge'; // Reset
    
    if (status === 'Live') {
        badge.classList.add('badge-green');
        if (pulse) pulse.style.display = 'inline-block';
    } else if (status === 'Maintenance') {
        badge.classList.add('badge-amber');
        if (pulse) pulse.style.display = 'none';
    } else if (status === 'Stop') {
        badge.classList.add('badge-red');
        if (pulse) pulse.style.display = 'none';
    }
}

async function setSystemStatus(status) {
    try {
        const res = await fetch('/api/system-status', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-user': 'ADMIN'
            },
            body: JSON.stringify({ status, adminUser: 'ADMIN' })
        });
        if (res.ok) {
            updateStatusUI(status);
            showToast(`System status updated to ${status}`);
        } else {
            showToast("Failed to update status");
        }
    } catch (e) {
        showToast("Error updating status");
    }
}


async function loadData() {
    showToast("Loading students...");
    const data = await fetchStudents(CURRENT_YEAR);
    window.students = data;
    
    // Default everyone to Present
    (window.students || []).forEach(s => {
        const sc = String(s.short_code);
        attendance[sc] = "P";
    });
    
    // Try to fetch existing attendance for today
    const today = new Date().toISOString().split('T')[0];
    const existing = await fetchAttendance(today, CURRENT_YEAR);
    existing.forEach(record => {
        attendance[String(record.short_code)] = record.status;
        if (record.whatsapp_sent_at) {
            sentStatus[String(record.short_code)] = record.whatsapp_sent_at;
        }
    });

    renderTable();
    showToast(`Loaded ${(window.students || []).length} students`);
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    if (start === end) {
        obj.textContent = end;
        return;
    }
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const timer = setInterval(() => {
        current += increment;
        obj.textContent = current;
        obj.classList.remove('count-animate');
        void obj.offsetWidth;
        obj.classList.add('count-animate');
        if (current == end) clearInterval(timer);
    }, stepTime);
}

function updateCircle(id, value, total) {
    const circle = document.getElementById(`circle-${id}`);
    const pctLabel = document.getElementById(`stat-${id}-pct`);
    if (!circle || !pctLabel) return;
    const max = 125.6; // 2 * PI * r (r=20)
    const pct = total > 0 ? (value / total) : 0;
    const offset = max - (pct * max);
    circle.style.strokeDashoffset = offset;
    pctLabel.textContent = Math.round(pct * 100) + '%';
}

async function changeYear(year) {
    setGlobalYear(year);
    await loadData();
}

function renderTable() {
  const tbody = document.getElementById("att-body");
  if (!tbody) return;

  const searchInput = document.getElementById("search-input");
  const query = searchInput ? searchInput.value.toLowerCase() : "";

  tbody.innerHTML = "";

  const filtered = (window.students || []).filter(s => {
    const sc = String(s.short_code);
    return s.name.toLowerCase().includes(query) || 
           sc.includes(query) ||
           rollNo(sc).toLowerCase().includes(query);
  });

  let p=0, a=0, od=0;
  filtered.forEach(s => {
    const sc = String(s.short_code);
    const st = attendance[sc] || "P";
    if(st==="P") p++;
    else if(st==="A") a++;
    else if(st==="OD") od++;
  });

  filtered.forEach(s => {
    const sc = String(s.short_code);
    const st = attendance[sc] || "P";
    const tr = document.createElement("tr");
    
    // Avatar calculation
    const nameParts = s.name.split(' ');
    const initials = nameParts.length > 1 ? nameParts[0][0] + nameParts[1][0] : nameParts[0][0];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const color = colors[s.id % colors.length];

    if(st==="A") tr.className="row-absent";
    else if(st==="OD") tr.className="row-od";
    
    // Row click toggle (P -> A)
    tr.onclick = (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('.wa-sent-badge')) return;
        const nextStatus = st === 'P' ? 'A' : 'P';
        setAtt(sc, nextStatus);
        if (nextStatus === 'P') {
            tr.classList.add('row-present-glow');
            setTimeout(() => tr.classList.remove('row-present-glow'), 1000);
        }
    };

    const sentAt = sentStatus[sc];
    const sentBadge = sentAt ? `<span class="wa-sent-badge" title="Sent at ${new Date(sentAt).toLocaleTimeString()}">📬 Sent</span>` : "";

    tr.innerHTML = `
      <td class="sno">${s.sno} ${sentBadge}</td>
      <td><span class="short-code">${sc}</span></td>
      <td><span class="roll-no">${rollNo(sc)}</span></td>
      <td class="name-cell">
        <div class="name-flex">
            <div class="st-avatar" style="background:${color}">${initials}</div>
            ${s.name}
        </div>
      </td>
      <td>
        <div class="att-cell">
          <button class="att-btn ${st==='P'?'active-p':''}" onclick="event.stopPropagation(); setAtt('${sc}','P')">P</button>
          <button class="att-btn ${st==='A'?'active-a':''}" onclick="event.stopPropagation(); setAtt('${sc}','A')">A</button>
          <button class="att-btn ${st==='OD'?'active-od':''}" onclick="event.stopPropagation(); setAtt('${sc}','OD')">OD</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  const total = filtered.length;
  
  // Animate stats
  const oldP = parseInt(document.getElementById("stat-present").textContent) || 0;
  const oldA = parseInt(document.getElementById("stat-absent").textContent) || 0;
  const oldOD = parseInt(document.getElementById("stat-od").textContent) || 0;

  animateValue("stat-present", oldP, p, 300);
  animateValue("stat-absent", oldA, a, 300);
  animateValue("stat-od", oldOD, od, 300);
  document.getElementById("stat-total").textContent = total;

  // Update circles
  updateCircle("total", total, total);
  updateCircle("present", p, total);
  updateCircle("absent", a, total);
  updateCircle("od", od, total);

  document.getElementById("notify-btn").disabled = (a+od) === 0 || query !== ""; // Only allow bulk notify when not searching to prevent accidents
}


function setAtt(short, status) {
  attendance[String(short)] = status;
  renderTable();
}

function markAllPresent() {
  (window.students || []).forEach(s => attendance[String(s.short_code)] = "P");
  renderTable();
  showToast("All students marked Present");
}

async function applyAttendance() {
  const absentRaw = document.getElementById("absent-input").value;
  const odRaw = document.getElementById("od-input").value;
  const parse = v => v.split(",").map(x=>x.trim()).filter(n=>n!=="");
  const absentList = parse(absentRaw).map(String);
  const odList = parse(odRaw).map(String);
  
  absentList.forEach(n => { if(attendance[n]!==undefined) attendance[n]="A"; });
  odList.forEach(n => { if(attendance[n]!==undefined) attendance[n]="OD"; });
  
  // Clear inputs after applying so subsequent entries don't re-apply or look stagnant
  document.getElementById("absent-input").value = "";
  document.getElementById("od-input").value = "";
  
  renderTable();
  
  // Sync to database
  const today = new Date().toISOString().split('T')[0];
  const records = (window.students || []).map(s => ({
      student_id: s.id,
      date: today,
      status: attendance[String(s.short_code)]
  }));
  
  await saveAttendanceRecords({date: today, records: records});
  showToast("Attendance synced to database");
}

function resetAll() {
  document.getElementById("absent-input").value = "";
  document.getElementById("od-input").value = "";
  (window.students || []).forEach(s => attendance[String(s.short_code)] = "P");
  renderTable();
}

function buildMessage(s, status, date) {
    const savedTmpls = JSON.parse(localStorage.getItem("attendx_templates") || "{}");
    let tmpl = savedTmpls[status === "A" ? "absent" : "od"];
    
    if (!tmpl) {
        const today = date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
        const statusText = status === "A" ? "absent" : "on duty (OD)";
        return `Dear Parent,\n\nYour ward *${s.name}* (${rollNo(s.short_code)}) was marked *${statusText}* on ${today}.\n\n— ${BATCH.deptName} Department`;
    }

    return tmpl
        .replace(/{{name}}/g, s.name)
        .replace(/{{roll_no}}/g, rollNo(s.short_code))
        .replace(/{{date}}/g, date || new Date().toLocaleDateString("en-IN"))
        .replace(/{{department}}/g, BATCH.deptName);
}

function waLink(phone, msg) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

let batchStudents = [];
let sentSet = new Set();

function openModal() {
  batchStudents = students.filter(s => attendance[s.short_code] === "A" || attendance[s.short_code] === "OD");
  sentSet = new Set();
  batchStudents.forEach((s, i) => {
      if (sentStatus[s.short_code]) sentSet.add(i);
  });
  renderModalList();
  document.getElementById("modal").classList.add("show");
}

let sendingMode = localStorage.getItem("sending_mode") || "tabs";

function toggleSendingMode(mode) {
  sendingMode = mode;
  localStorage.setItem("sending_mode", mode);
  renderModalList();
}

async function sendAll() {
  if (sendingMode === 'auto') {
    const url = localStorage.getItem("attendance_webhook_url");
    if (!url) {
      showToast("⚠️ Configure Webhook in WhatsApp Setup first!");
      return;
    }
    
    const toSend = batchStudents.filter((_, i) => !sentSet.has(i));
    if (toSend.length === 0) return;

    const btn = document.querySelector(".btn-wa-all");
    btn.disabled = true;
    btn.textContent = "⚡ Sending to Webhook...";

    const payload = {
      type: "attendance_batch",
      dept: BATCH.deptName,
      date: new Date().toLocaleDateString("en-IN"),
      students: toSend.map(s => ({
        name: s.name,
        roll: rollNo(s.short_code),
        status: attendance[s.short_code],
        phone: s.parent_phone,
        message: buildMessage(s, attendance[s.short_code])
      }))
    };

    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (r.ok) {
            toSend.forEach((_, i) => {
                const originalIdx = batchStudents.indexOf(toSend[i]);
                sentSet.add(originalIdx);
            });
            showToast(`✅ ${toSend.length} messages sent automatically!`);
            renderModalList();
        } else {
            showToast("❌ Webhook error: " + r.status);
            renderModalList();
        }
    } catch(e) {
        showToast("❌ Connection to automation failed");
        renderModalList();
    }
    return;
  }

  let count = 0;
  let blockedAny = false;
  batchStudents.forEach((s, i) => {
    if (sentSet.has(i)) return;
    setTimeout(() => {
      const msg = buildMessage(s, attendance[s.short_code]);
      const win = window.open(waLink(s.parent_phone, msg), "_blank");
      if (!win || win.closed || typeof win.closed === 'undefined') {
        blockedAny = true;
      } else {
        sentSet.add(i);
        renderModalList();
      }
      if (i === batchStudents.length - 1 && blockedAny) {
        showToast("⚠️ Pop-ups blocked! Please allow pop-ups.");
        renderModalList(true);
      }
    }, count * 400);
    count++;
  });
}

function renderModalList(showWarning = false) {
  const list = document.getElementById("modal-list");
  const isAuto = sendingMode === 'auto';
  const remaining = batchStudents.filter((_, i) => !sentSet.has(i)).length;

  list.innerHTML = `
    <div class="mode-select">
      <div class="mode-label">Mode: ${remaining} Remaining</div>
      <div class="mode-btn-group">
        <button class="m-btn ${!isAuto?'active':''}" onclick="toggleSendingMode('tabs')">📱 Browser Tabs</button>
        <button class="m-btn ${isAuto?'active':''}" onclick="toggleSendingMode('auto')">⚡ Fully Auto (n8n)</button>
      </div>
    </div>
    ${!isAuto ? `
      <div class="next-action-card" style="margin-bottom: 20px; text-align: center; background: var(--surface2); padding: 15px; border-radius: 10px; border: 1px solid var(--border);">
        <button class="btn btn-wa-all" style="width: 100%; justify-content: center; background: #25D366; color: white;" onclick="sendNext()" ${remaining === 0 ? 'disabled' : ''}>
          ${remaining > 0 ? '🚀 Send Next Student' : '✅ All Notified!'}
        </button>
        <p class="next-hint" style="font-size: 11px; color: var(--muted); margin-top: 8px;">Opens WhatsApp Web for the next absentee</p>
      </div>
    ` : ''}
  `;

  if (showWarning && !isAuto) {
    const warn = document.createElement("div");
    warn.className = "popup-warning";
    warn.innerHTML = `
      <div style="font-weight:600; color:var(--red); margin-bottom:4px">⚠️ Pop-ups Blocked</div>
      <div style="font-size:11px; line-height:1.4">Browsers block multiple tabs. Click the address bar icon and select <strong>"Always allow pop-ups"</strong>.</div>
    `;
    list.appendChild(warn);
  }

  batchStudents.forEach((s, i) => {
      const st = attendance[s.short_code];
      const isSent = sentSet.has(i);
      const msg = buildMessage(s, st);
      const div = document.createElement("div");
      div.className = `notify-row ${isSent ? 'sent-batch' : ''}`;
      div.id = `nr-${i}`;
      div.innerHTML = `
      <div class="notify-info">
        <div class="notify-name">${s.name} ${isSent ? '✅' : ''}
          <span class="notify-status ${st==='A'?'ns-absent':'ns-od'}" style="margin-left:6px">${st}</span>
        </div>
        <div class="notify-meta">${rollNo(s.short_code)} &nbsp;·&nbsp; Parent: +${s.parent_phone}</div>
      </div>
      <a class="wa-btn" href="${waLink(s.parent_phone, msg)}" target="_blank" onclick="markSentLocal(${i}, ${s.id})">
        💬 Send
      </a>`;
      list.appendChild(div);
  });

  if (isAuto && batchStudents.length > 0) {
      const row = document.createElement("div");
      row.innerHTML = `
        <button class="btn-wa-all" onclick="sendAll()" style="width:100%; border:none; padding:12px; background:var(--accent); color:white; border-radius:8px; font-weight:600; cursor:pointer;">
          ⚡ Send All via n8n Webhook
        </button>
        <div class="info-box" style="margin-top:10px; font-size:11px; color:var(--muted); text-align:center;">
          This sends data to your n8n workflow for full automation.
        </div>
      `;
      list.appendChild(row);
  }
}

function sendNext() {
    const nextIdx = batchStudents.findIndex((_, i) => !sentSet.has(i));
    if (nextIdx === -1) return;
    
    const s = batchStudents[nextIdx];
    const st = attendance[s.short_code];
    const msg = buildMessage(s, st);
    
    // Open link
    window.open(waLink(s.parent_phone, msg), '_blank');
    
    // Mark as sent
    markSentLocal(nextIdx, s.id);
    
    // Scroll the list to the next one
    setTimeout(() => {
        const nextEl = document.getElementById(`nr-${nextIdx + 1}`);
        if (nextEl) nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function closeModal() {
  document.getElementById("modal").classList.remove("show");
}

async function markSentLocal(idx, student_id) {
    const s = batchStudents[idx];
    if (!s) return;
    
    sentSet.add(idx);
    const now = new Date().toISOString();
    sentStatus[s.short_code] = now;
    
    renderModalList();
    renderTable();
    
    const today = new Date().toISOString().split('T')[0];
    apiMarkAttendanceSent(student_id, today).catch(console.error);
}

function showToast(msg) {
  const t = document.getElementById("toast");
  const msgEl = document.getElementById("toast-msg");
  if (!t || !msgEl) return;
  msgEl.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  initAttendance();

});

let rawSummary = [];

async function openSummary() {
  showToast("Loading summary...");
  rawSummary = await fetchAttendanceSummary(CURRENT_YEAR);
  document.getElementById("summary-modal").classList.add("show");
  renderSummaryList();
}

function closeSummary() {
  document.getElementById("summary-modal").classList.remove("show");
}

function renderSummaryList() {
  const sInput = document.getElementById("summary-search");
  sInput.dataset.mode = 'list';
  const q = sInput.value.toLowerCase();
  
  document.getElementById("summary-back-btn").style.display = "none";
  document.getElementById("summary-title").textContent = "Total Attendance Summary";
  
  const stats = {};
  (window.students || []).forEach(s => {
      stats[s.short_code] = { student: s, P: 0, A: 0, OD: 0, total: 0 };
  });
  
  rawSummary.forEach(r => {
      if (stats[r.short_code]) {
          stats[r.short_code][r.status] = (stats[r.short_code][r.status] || 0) + 1;
          stats[r.short_code].total++;
      }
  });

  const content = document.getElementById("summary-content");
  content.innerHTML = "";
  
  Object.values(stats).forEach(data => {
      const s = data.student;
      if (q && !s.name.toLowerCase().includes(q) && !String(s.short_code).includes(q)) return;
      
      const div = document.createElement("div");
      div.className = "notify-row";
      div.style.cursor = "pointer";
      div.onclick = () => {
          sInput.value = "";
          renderStudentDetail(s.short_code);
      };
      
      const pct = data.total > 0 ? Math.round((data.P / data.total) * 100) : 0;
      let pctColor = pct >= 75 ? "var(--green)" : (pct >= 60 ? "var(--amber)" : "var(--red)");
      if (data.total === 0) pctColor = "var(--muted)";

      div.innerHTML = `
        <div class="notify-info">
          <div class="notify-name">${s.name}</div>
          <div class="notify-meta">${s.roll_no || rollNo(s.short_code)}</div>
        </div>
        <div style="display:flex; gap:12px; font-size:12px; font-family:var(--mono);">
          <span style="color:var(--green)">P:${data.P}</span>
          <span style="color:var(--red)">A:${data.A}</span>
          <span style="color:var(--amber)">OD:${data.OD}</span>
        </div>
        <div style="font-weight:600; font-family:var(--mono); color:${pctColor}; width:45px; text-align:right;">
          ${data.total > 0 ? pct + '%' : '—'}
        </div>
      `;
      content.appendChild(div);
  });
}

function renderStudentDetail(short_code) {
  const sInput = document.getElementById("summary-search");
  sInput.dataset.mode = 'detail';
  
  document.getElementById("summary-back-btn").style.display = "inline-flex";
  const s = window.students.find(st => st.short_code == short_code);
  document.getElementById("summary-title").textContent = `Details: ${s.name}`;
  
  const content = document.getElementById("summary-content");
  content.innerHTML = "";
  
  const records = rawSummary.filter(r => r.short_code == short_code).sort((a,b) => new Date(b.date) - new Date(a.date));
  
  if (records.length === 0) {
      content.innerHTML = `<div style="text-align:center; padding:20px; color:var(--muted); font-size:13px;">No attendance records found.</div>`;
      return;
  }
  
  records.forEach(r => {
      const div = document.createElement("div");
      div.className = "notify-row";
      
      const d = new Date(r.date + "T00:00:00").toLocaleDateString('en-IN', {weekday:'short', day:'2-digit', month:'short', year:'numeric'});
      
      let badge = '';
      if(r.status === 'P') badge = `<span class="badge badge-green">Present</span>`;
      else if(r.status === 'A') badge = `<span class="notify-status ns-absent" style="padding:4px 8px">Absent</span>`;
      else if(r.status === 'OD') badge = `<span class="notify-status ns-od" style="padding:4px 8px">On Duty</span>`;

      div.innerHTML = `
        <div class="notify-info">
          <div class="notify-name" style="font-family:var(--mono); font-weight:500;">${d}</div>
        </div>
        <div>${badge}</div>
      `;
      content.appendChild(div);
  });
}
