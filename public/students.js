let editIdx = null; // This will now store the array index for editing
let currentSort = { key: 'sno', order: 'asc' };
let selectedStudents = new Set();

async function initStudents() {
  const yFilter = document.getElementById("year-filter");
  const sFilter = document.getElementById("section-filter");
  if (yFilter) yFilter.value = CURRENT_YEAR;
  if (sFilter) sFilter.value = "ALL";
  updateBatchUI();
  await loadStudents();
}

async function loadStudents() {
  const yFilter = document.getElementById("year-filter");
  const year = yFilter ? yFilter.value : CURRENT_YEAR;
  setGlobalYear(year);
  
  console.log("loadStudents called for year:", year);
  toast("Syncing directory...");
  try {
    const data = await fetchStudents(year);
    window.students = data;
    console.log("Students loaded from API:", window.students.length);
    renderTable();
    const count = document.getElementById("count");
    if (count) count.textContent = window.students.length;
  } catch (err) {
    console.error("Failed to load students:", err);
    toast("Error loading students");
  }
}

async function changeYear(year) {
  setGlobalYear(year);
  await loadStudents();
}

function handleSort(key) {
  if (currentSort.key === key) {
    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.key = key;
    currentSort.order = 'asc';
  }
  renderTable();
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(' ').filter(n => n).map(n => n[0]).join('').slice(0, 2).toUpperCase() || "?";
}

function getAvatarColor(name) {
  const colors = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#8b5cf6', '#10b981'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function renderTable() {
  console.log("renderTable called. window.students length:", (window.students || []).length);
  const tbody = document.getElementById("tbody");
  if (!tbody) {
    console.error("tbody not found!");
    return;
  }

  const searchInput = document.getElementById("search") || document.getElementById("search-input");
  const q = searchInput ? searchInput.value.toLowerCase() : "";
  const secFilter = document.getElementById("section-filter") ? document.getElementById("section-filter").value : "ALL";

  const filtered = (window.students || []).filter(s => {
    // Dual Filter: Section
    const matchesSection = secFilter === "ALL" || s.section === secFilter;
    if (!matchesSection) return false;

    // Search query
    const sc = String(s.short_code || "");
    const rNo = s.roll_no || (typeof rollNo === 'function' ? rollNo(sc) : sc);
    const matchesSearch = (s.name || "").toLowerCase().includes(q) || 
                    String(rNo).toLowerCase().includes(q) || 
                    sc.includes(q) || 
                    String(s.phone || "").includes(q);
    return matchesSearch;
  });

  // Sort filtered list ... (keep existing sort logic)
  filtered.sort((a, b) => {
    let valA = a[currentSort.key];
    let valB = b[currentSort.key];
    if (currentSort.key === 'roll_no') {
      valA = a.roll_no || rollNo(a.short_code);
      valB = b.roll_no || rollNo(b.short_code);
    }
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    
    if (valA < valB) return currentSort.order === 'asc' ? -1 : 1;
    if (valA > valB) return currentSort.order === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Render headers
  const theadRow = document.getElementById("thead-row");
  const sortIcon = (key) => {
    if (currentSort.key !== key) return `<span class="sort-icon">⇅</span>`;
    return `<span class="sort-icon sort-active">${currentSort.order === 'asc' ? '▲' : '▼'}</span>`;
  };

  theadRow.innerHTML = `
    <th class="cb-cell"><input type="checkbox" class="custom-cb" id="select-all" onclick="toggleSelectAll(this)"></th>
    <th class="sortable" onclick="handleSort('sno')">S.No ${sortIcon('sno')}</th>
    <th class="sortable" onclick="handleSort('short_code')">Short ${sortIcon('short_code')}</th>
    <th class="sortable" onclick="handleSort('roll_no')">Roll No ${sortIcon('roll_no')}</th>
    <th class="sortable" onclick="handleSort('name')">Name ${sortIcon('name')}</th>
    <th>Student Phone</th><th>Parent Phone</th><th>Parent Name</th>
    ${CUSTOM_COLS.map(c => `<th>${c} <span style="cursor:pointer;opacity:0.5;font-size:10px;margin-left:4px" onclick="removeColumn('${c}')">✕</span></th>`).join('')}
    <th>Actions</th>`;

  const countDisplay = document.getElementById("count");
  if (countDisplay) {
    countDisplay.innerHTML = q !== "" || secFilter !== "ALL" ? `${filtered.length} <span style="font-size:11px; color:var(--muted)">of ${window.students.length}</span>` : window.students.length;
  }
  
  tbody.innerHTML = "";
  filtered.forEach((s) => {
    const isSelected = selectedStudents.has(s.id);
    const origIdx = window.students.findIndex(st => st.id === s.id);
    const displayRoll = s.roll_no || rollNo(s.short_code);
    
    const tr = document.createElement("tr");
    if (isSelected) tr.style.background = "rgba(59, 130, 246, 0.08)";

    let html = `
      <td class="cb-cell"><input type="checkbox" class="custom-cb" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleStudentSelection(${s.id})"></td>
      <td style="color:var(--muted);font-family:var(--mono);font-size:12px">${s.sno}</td>
      <td><span class="short-code">${s.short_code}</span></td>
      <td><span class="roll-chip">${displayRoll}</span></td>
      <td>
        <div class="name-flex">
          <div class="st-avatar" style="background:${getAvatarColor(s.name)}">${getInitials(s.name)}</div>
          <span style="font-weight:500">${s.name}</span>
        </div>
      </td>
      <td class="phone-cell">${s.phone}</td>
      <td class="phone-cell">${s.parent_phone}</td>
      <td style="font-size:12px;color:var(--muted2)">${s.parent_name}</td>`;
      
    CUSTOM_COLS.forEach(c => {
        const val = s.custom_data ? s.custom_data[c] : s[c];
        html += `<td><span style="font-size:13px;color:var(--text)">${val ? val : '—'}</span></td>`;
    });
    
    html += `<td><div class="actions-cell">
        <button class="btn btn-sm btn-edit" onclick="event.stopPropagation(); openEdit(${origIdx})">✏ Profiles</button>
        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteStudent(${origIdx})">✕</button>
      </div></td>`;
      
    tr.innerHTML = html;
    tr.onclick = () => toggleStudentSelection(s.id);
    tbody.appendChild(tr);
  });
  updateBulkToolbar();
}

function toggleSelectAll(cb) {
    if (cb.checked) {
        window.students.forEach(s => selectedStudents.add(s.id));
    } else {
        selectedStudents.clear();
    }
    renderTable();
}

function toggleStudentSelection(id) {
    if (selectedStudents.has(id)) selectedStudents.delete(id);
    else selectedStudents.add(id);
    renderTable();
}

function clearSelection() {
    selectedStudents.clear();
    const sa = document.getElementById("select-all");
    if (sa) sa.checked = false;
    renderTable();
}

function updateBulkToolbar() {
    const bar = document.getElementById("bulk-toolbar");
    const count = document.getElementById("bulk-count");
    if (!bar || !count) return;
    if (selectedStudents.size > 0) {
        bar.classList.add("show");
        count.textContent = `${selectedStudents.size} Selected`;
    } else {
        bar.classList.remove("show");
    }
}

async function deleteSelected() {
    if (!confirm(`Delete ${selectedStudents.size} selected students?`)) return;
    const ids = Array.from(selectedStudents);
    toast(`Deleting ${ids.length} students...`);
    for (const id of ids) await apiDeleteStudent(id);
    selectedStudents.clear();
    await loadStudents();
}

async function deleteAllStudents() {
  if (!confirm("⚠️ Are you sure you want to delete ALL students? This cannot be undone.")) return;
  if (!confirm("Final Confirmation: Delete everything?")) return;
  
  await apiDeleteAllStudents();
  await loadStudents();
  toast("All students deleted");
}

function openAdd() {
  editIdx = null;
  document.getElementById("p-name-head").textContent = "New Student Registration";
  document.getElementById("p-roll-head").textContent = "Assign Roll No below";
  document.getElementById("p-avatar").textContent = "+";
  document.getElementById("p-avatar").style.background = "var(--accent)";
  document.getElementById("p-stats-row").style.display = "none";

  ["f-short","f-roll","f-name","f-phone","f-parent","f-pname"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("f-year").value = CURRENT_YEAR;
  document.getElementById("f-section").value = "A";
  injectCustomColInputs({});
  document.getElementById("overlay").classList.add("show");
}

function openEdit(idx) {
  editIdx = idx;
  const s = window.students[idx];
  document.getElementById("p-name-head").textContent = s.name;
  document.getElementById("p-roll-head").textContent = s.roll_no || rollNo(s.short_code);
  document.getElementById("p-avatar").textContent = getInitials(s.name);
  document.getElementById("p-avatar").style.background = getAvatarColor(s.name);
  document.getElementById("p-stats-row").style.display = "grid";

  // Mock Performance Stats (can be linked to real data later)
  document.getElementById("ps-att").textContent = "92%";
  document.getElementById("ps-marks").textContent = "8.4";

  document.getElementById("f-short").value = s.short_code;
  document.getElementById("f-roll").value = s.roll_no || rollNo(s.short_code);
  document.getElementById("f-name").value = s.name;
  document.getElementById("f-phone").value = s.phone;
  document.getElementById("f-parent").value = s.parent_phone;
  document.getElementById("f-pname").value = s.parent_name;
  document.getElementById("f-year").value = s.year || CURRENT_YEAR;
  document.getElementById("f-section").value = s.section || "A";
  injectCustomColInputs(s.custom_data || {});
  document.getElementById("overlay").classList.add("show");
}

function injectCustomColInputs(data) {
  const fg = document.getElementById("modal-form-grid");
  if (!fg) return;
  const existing = fg.querySelectorAll(".custom-group");
  existing.forEach(el => el.remove());
  
  CUSTOM_COLS.forEach(c => {
    const div = document.createElement("div");
    div.className = "form-group custom-group full";
    div.innerHTML = `<label>${c}</label><textarea class="form-input custom-input" data-col="${c}" rows="1" style="resize:none; overflow:hidden; min-height: 38px; padding-top: 10px;" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${data[c] || ''}</textarea>`;
    fg.appendChild(div);
  });

  // Auto-resize on initial load
  setTimeout(() => {
    fg.querySelectorAll(".custom-input").forEach(tx => {
       tx.style.height = 'auto';
       tx.style.height = tx.scrollHeight + 'px';
    });
  }, 10);
}

function closeModal() {
  document.getElementById("overlay").classList.remove("show");
}

async function saveStudentToDB(){
  const short = document.getElementById("f-short").value;
  const roll = document.getElementById("f-roll").value.trim();
  const name = document.getElementById("f-name").value;
  const phone = document.getElementById("f-phone").value;
  const parent = document.getElementById("f-parent").value;
  const pname = document.getElementById("f-pname").value;

  const data = {
    short_code: short,
    roll_no: roll || rollNo(short),
    name: name,
    phone: phone,
    parent_phone: parent,
    parent_name: pname,
    year: parseInt(document.getElementById("f-year").value) || CURRENT_YEAR,
    section: document.getElementById("f-section").value || CURRENT_SECTION,
    dept: BATCH.dept,
    sno: editIdx !== null ? window.students[editIdx].sno : (window.students || []).length + 1,
    custom_data: {}
  };
  
  document.querySelectorAll(".custom-input").forEach(inp => {
      data.custom_data[inp.dataset.col] = inp.value;
  });

  if(!data.short_code||!data.name){alert("Short code and name are required.");return;}

  if(editIdx!==null){
    await apiUpdateStudent(window.students[editIdx].id, data);
    toast("Student updated successfully");
  } else {
    await apiSaveStudent(data);
    toast("Student added");
  }
  
  closeModal();
  await loadStudents();
}

// Rename original saveStudent to match HTML or update HTML
window.saveStudent = saveStudentToDB;

async function deleteStudent(i){
  if(!confirm(`Delete ${window.students[i].name}?`))return;
  await apiDeleteStudent(window.students[i].id);
  await loadStudents();
  toast("Student removed");
}

function toast(msg){
  const el = document.getElementById("tmsg");
  if (!el) return;
  el.textContent = msg;
  const t=document.getElementById("toast");
  t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2800);
}

function saveBatchConfig() {
  const newBatch = {
    prefix: document.getElementById("b-prefix").value.toUpperCase() || "ES",
    year: document.getElementById("b-year").value || "24",
    dept: document.getElementById("b-dept").value.toUpperCase() || "AD",
    deptName: document.getElementById("b-dept-name").value || "AI & DS"
  };
  localStorage.setItem("attendx_batch", JSON.stringify(newBatch));
  Object.assign(BATCH, newBatch);
  updateBatchUI();
  renderTable();
  toast("Batch configuration updated!");
}

function updateBatchUI() {
  const display = document.getElementById("batch-display");
  if (display) display.textContent = `${getPrefix()} · ${BATCH.deptName}`;
  
  ["b-prefix","b-year","b-dept","b-dept-name"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = BATCH[id.split("-")[1] === "name" ? "deptName" : id.split("-")[1]];
  });
}

function addColumn() {
  const name = prompt("Enter new column name:");
  if (!name) return;
  if (CUSTOM_COLS.includes(name)) { alert("Column already exists."); return; }
  CUSTOM_COLS.push(name);
  localStorage.setItem("attendx_custom_cols", JSON.stringify(CUSTOM_COLS));
  renderTable();
  toast("Column added!");
}

function removeColumn(name) {
  if (!confirm(`Delete column "${name}"?`)) return;
  const idx = CUSTOM_COLS.indexOf(name);
  if (idx > -1) CUSTOM_COLS.splice(idx, 1);
  localStorage.setItem("attendx_custom_cols", JSON.stringify(CUSTOM_COLS));
  renderTable();
  toast("Column deleted!");
}

function exportCSV() {
  if (!window.students || window.students.length === 0) {
    alert("No data to export.");
    return;
  }
  
  let headers = ["S.No", "Short Code", "Roll No", "Name", "Student Phone", "Parent Phone", "Parent Name"];
  let csvContent = headers.concat(CUSTOM_COLS).join(",") + "\n";
  
  window.students.forEach(s => {
      let rowData = [
          s.sno, s.short_code, s.roll_no || rollNo(s.short_code), s.name, s.phone, s.parent_phone, s.parent_name
      ];
      CUSTOM_COLS.forEach(c => {
          rowData.push(s.custom_data ? s.custom_data[c] : s[c] || ""); 
      });
      csvContent += rowData.map(v => `"${v || ''}"`).join(",") + "\n";
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `students_year${CURRENT_YEAR}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function importCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  toast("Importing students...");
  const reader = new FileReader();
  reader.onload = async (evt) => {
    const text = evt.target.result;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return;
    
    let added = 0;
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const row = parts.map(p => p.replace(/^"|"$/g, '').trim());
        if (row.length >= 4) {
             const data = {
                 sno: parseInt(row[0]) || (added + (window.students || []).length + 1),
                 short_code: row[1],
                 roll_no: row[2],
                 name: row[3],
                 phone: row[4] || "",
                 parent_phone: row[5] || "",
                 parent_name: row[6] || "",
                 year: CURRENT_YEAR,
                 dept: BATCH.dept
             };
             await apiSaveStudent(data);
             added++;
        }
    }
    toast(`Imported ${added} students`);
    await loadStudents();
    e.target.value = ''; // reset file input
  };
  reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", () => {
  initStudents();
  const fShort = document.getElementById("f-short");
  const fRoll = document.getElementById("f-roll");
  if (fShort && fRoll) {
    fShort.addEventListener("input", e => {
      if (editIdx === null || fRoll.value === "" || fRoll.value === rollNo(window.students[editIdx]?.short_code || "")) {
         fRoll.value = e.target.value ? rollNo(e.target.value) : "";
      }
    });
  }
});
