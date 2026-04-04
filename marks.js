let activeSubjects = [];
function loadSubjects() {
    activeSubjects = JSON.parse(localStorage.getItem(`attendx_active_subjects_${CURRENT_YEAR}`) || '["Data Structures"]');
}
function saveSubjects() {
    localStorage.setItem(`attendx_active_subjects_${CURRENT_YEAR}`, JSON.stringify(activeSubjects));
}
let marksData = {}; // Now managed via API
let viewMode = 'entry'; // 'entry' or 'display'
let currentSort = { key: 'name', order: 'asc' };
let examTypes = [];
const DEFAULT_EXAMS = ["CIA 1", "CIA 2", "CIA 3", "End Semester", "Assignment"];

function loadExamTypes() {
    examTypes = JSON.parse(localStorage.getItem('attendx_exam_types') || JSON.stringify(DEFAULT_EXAMS));
}

function saveExamTypes() {
    localStorage.setItem('attendx_exam_types', JSON.stringify(examTypes));
}

function renderExamTypeSelect() {
    const sel = document.getElementById("exam-type");
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = "";
    examTypes.forEach(et => {
        const opt = document.createElement("option");
        opt.value = et;
        opt.textContent = et;
        sel.appendChild(opt);
    });
    if (examTypes.includes(current)) {
        sel.value = current;
    }
}

async function initMarks() {
    const filter = document.getElementById("year-filter");
    if (filter) filter.value = CURRENT_YEAR;
    loadExamTypes();
    renderExamTypeSelect();
    loadSubjects();
    
    // Check for ADMIN role to show management controls
    const loggedStaff = localStorage.getItem("attendx_logged_staff");
    if (loggedStaff === 'ADMIN') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'inline-flex';
        });
    }

    await loadData();
}

function animateValue(id, start, end, duration, isPct=false) {
    const obj = document.getElementById(id);
    if (!obj) return;
    if (start === end) {
        obj.textContent = end + (isPct ? '%' : '');
        return;
    }
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / (range || 1)));
    const timer = setInterval(() => {
        current += increment;
        obj.textContent = current + (isPct ? '%' : '');
        obj.classList.remove('count-animate');
        void obj.offsetWidth;
        obj.classList.add('count-animate');
        if (current == end) clearInterval(timer);
    }, stepTime || 1);
}

function updateCircle(id, value, total, isPct=true) {
    const circle = document.getElementById(`circle-${id}`);
    const pctLabel = document.getElementById(`s-${id}-pct`);
    if (!circle || !pctLabel) return;
    const max = 125.6;
    const pct = isPct ? (value / 100) : (total > 0 ? value / total : 0);
    const offset = max - (pct * max);
    circle.style.strokeDashoffset = offset;
    pctLabel.textContent = Math.round(pct * 100) + '%';
}

async function loadStudents() {
  showToast("Loading students...");
  const data = await fetchStudents(CURRENT_YEAR);
  window.students = data; // Force update global
  renderTable();
  const count = document.getElementById("count");
  if (count) count.textContent = window.students.length;
}

async function loadData() {
    console.log("loadData called for year:", CURRENT_YEAR);
    showToast("Loading marks...");
    const examType = document.getElementById("exam-type").value;
    
    const fetchedStudents = await fetchStudents(CURRENT_YEAR);
    window.students = fetchedStudents; // Force update global
    console.log("Students loaded in marks.js:", window.students);

    const apiMarks = await fetchMarks(CURRENT_YEAR, examType);
    console.log("Fetched marks from API:", apiMarks);
    
    marksData = {};
    apiMarks.forEach(m => {
        const sc = String(m.short_code);
        if (!marksData[sc]) marksData[sc] = {};
        marksData[sc][m.subject] = m.score;
        if (!activeSubjects.includes(m.subject)) {
            activeSubjects.push(m.subject);
        }
    });
    
    saveSubjects();
    renderTopBar();
    renderTable();
    showToast("Data loaded from database");
}

async function changeYear(year) {
    setGlobalYear(year);
    loadSubjects();
    await loadData();
}

function getMax(){return parseInt(document.getElementById("max-marks").value)||50;}

function handleSort(key) {
  if (currentSort.key === key) {
    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.key = key;
    currentSort.order = 'asc';
  }
  renderTable();
}

async function fillRemainingPrompt() {
  const val = prompt(`Enter mark to fill for all empty cells (Max: ${getMax()}):`);
  if (val === null || val === "") return;
  const num = parseInt(val);
  if (isNaN(num) || num < 0 || num > getMax()) {
    alert("Invalid mark value.");
    return;
  }
  
  const records = [];
  const examType = document.getElementById("exam-type").value;
  
  students.forEach(s => {
    if (!marksData[s.short_code]) marksData[s.short_code] = {};
    activeSubjects.forEach(subj => {
      if (marksData[s.short_code][subj] === undefined || marksData[s.short_code][subj] === null) {
        marksData[s.short_code][subj] = num;
        records.push({
            student_id: s.id,
            subject: subj,
            exam_type: examType,
            score: num
        });
      }
    });
  });
  
  if (records.length > 0) {
      await saveMarksRecords(records);
  }
  renderTable();
  toast(`Filled empty cells with ${num} and synced`);
}

function getGrade(pct){
  if(pct>=90)return{g:"O",cls:"g-o"};
  if(pct>=75)return{g:"A+",cls:"g-a"};
  if(pct>=65)return{g:"A",cls:"g-a"};
  if(pct>=55)return{g:"B+",cls:"g-b"};
  if(pct>=45)return{g:"B",cls:"g-b"};
  if(pct>=40)return{g:"C",cls:"g-c"};
  return{g:"F",cls:"g-f"};
}

function renderTable() {
  console.log("renderTable called. Students available:", (window.students || []).length);
  const theadRow = document.getElementById("thead-row");
  const tbody = document.getElementById("tbody");
  if (!tbody) {
    console.error("tbody not found in students.html!");
    return;
  }
  
  const searchInput = document.getElementById("search-input");
  const q = searchInput ? searchInput.value.toLowerCase() : "";

  const filtered = (window.students || []).filter(s => {
    const sc = String(s.short_code);
    const rNo = s.roll_no || rollNo(sc);
    return s.name.toLowerCase().includes(q) || 
           rNo.toLowerCase().includes(q) || 
           sc.includes(q);
  });
  console.log("Filtered students:", filtered.length);

  filtered.sort((a, b) => {
    let valA, valB;
    if (currentSort.key === 'avg') {
      const getAvg = (s) => {
        const stMarks = marksData[s.short_code];
        if (!stMarks) return -1;
        const subjs = Object.keys(stMarks).filter(subj => activeSubjects.includes(subj));
        if (subjs.length === 0) return -1;
        const total = subjs.reduce((sum, subj) => sum + stMarks[subj], 0);
        const maxTotal = subjs.length * getMax();
        return maxTotal > 0 ? (total / maxTotal) * 100 : -1;
      };
      valA = getAvg(a); valB = getAvg(b);
    } else if (currentSort.key === 'roll_no') {
      valA = rollNo(a.short_code); valB = rollNo(b.short_code);
    } else {
      valA = a[currentSort.key === 'short' ? 'short_code' : currentSort.key]; valB = b[currentSort.key === 'short' ? 'short_code' : currentSort.key];
    }
    
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return currentSort.order === 'asc' ? -1 : 1;
    if (valA > valB) return currentSort.order === 'asc' ? 1 : -1;
    return 0;
  });

  // Render headers
  const sortIcon = (key) => ` <span style="cursor:pointer;opacity:${currentSort.key===key?1:0.3}">${currentSort.key===key ? (currentSort.order==='asc'?'▲':'▼') : '↕'}</span>`;
  
  let headHtml = `
    <th onclick="handleSort('sno')" style="cursor:pointer">S.No${sortIcon('sno')}</th>
    <th onclick="handleSort('short')" style="cursor:pointer">Short${sortIcon('short')}</th>
    <th onclick="handleSort('roll_no')" style="cursor:pointer">Roll No${sortIcon('roll_no')}</th>
    <th onclick="handleSort('name')" style="cursor:pointer">Name${sortIcon('name')}</th>`;
  
  activeSubjects.forEach(s => {
    headHtml += `<th>${s}</th>`;
  });
  
  if (viewMode === 'display') {
    headHtml += `<th>Total</th><th onclick="handleSort('avg')" style="cursor:pointer">Avg %${sortIcon('avg')}</th><th>Grade</th>`;
  } else {
    headHtml += `<th>Actions</th>`;
  }
  theadRow.innerHTML = headHtml;

  // Render rows
  tbody.innerHTML = "";
  (window.students || []).forEach((s, rowIndex) => {
    const tr = document.createElement("tr");
    const sc = String(s.short_code);
    
    // Avatar calculation
    const nameParts = s.name.split(' ');
    const initials = nameParts.length > 1 ? nameParts[0][0] + nameParts[1][0] : nameParts[0][0];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const color = colors[s.id % colors.length];

    let rowHtml = `
      <td style="color:var(--muted);font-family:var(--mono);font-size:12px">${s.sno}</td>
      <td style="font-family:var(--mono);font-weight:500;color:var(--accent)">${sc}</td>
      <td style="font-family:var(--mono);font-size:12px;color:var(--muted2)">${rollNo(sc)}</td>
      <td style="font-weight:500">
        <div class="name-flex">
            <div class="st-avatar" style="background:${color}">${initials}</div>
            ${s.name}
        </div>
      </td>`;

    let total = 0;
    let count = 0;
    
    activeSubjects.forEach((subj, colIndex) => {
      const m = (marksData[sc] && marksData[sc][subj]) || null;
      if (viewMode === 'entry') {
        const pct = m != null ? Math.round((m / getMax()) * 100) : null;
        const grClass = m != null ? getGrade(pct).cls.replace('g-','sc-') : '';
        rowHtml += `<td class="${grClass}"><input class="score-inp" type="number" min="0" max="${getMax()}" value="${m!=null?m:''}"
            placeholder="—" data-row="${rowIndex}" data-col="${colIndex}" onkeydown="handleKeyNav(event)" onchange="setMark('${sc}','${subj}',this)" /></td>`;
      } else {
        const pct = m != null ? Math.round((m / getMax()) * 100) : null;
        const grClass = m != null ? getGrade(pct).cls.replace('g-','sc-') : '';
        rowHtml += `<td class="${grClass}" style="font-family:var(--mono);font-weight:600">${m!=null?m:'—'}</td>`;
      }
      if (m != null) { total += m; count++; }
    });

    if (viewMode === 'display') {
      const avgPct = count > 0 ? Math.round(((total / (count * getMax())) * 100)) : null;
      if (avgPct !== null && avgPct < 40) tr.classList.add("row-fail");
      const gr = avgPct != null ? getGrade(avgPct) : null;
      rowHtml += `
        <td style="font-family:var(--mono);color:var(--accent)">${total}</td>
        <td style="font-family:var(--mono)">
            <div style="display:flex;align-items:center;gap:8px">
                ${avgPct != null ? avgPct+'%' : '—'}
                <div class="sparkline-container"><div class="spark-bar ${gr ? 'spark-'+gr.g.toLowerCase()[0] : ''}" style="width:${avgPct||0}%"></div></div>
            </div>
        </td>
        <td>${gr ? `<span class="grade ${gr.cls}">${gr.g}</span>` : '—'}</td>`;
    } else {
        rowHtml += `<td><div class="actions-cell">
            <button class="btn btn-sm btn-ghost" onclick="clearStudentMarks('${s.short_code}')">↺</button>
        </div></td>`;
    }

    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });
  recalcStats();
}

function renderTopBar() {
    const container = document.getElementById("subject-tags");
    if (!container) return;
    container.innerHTML = "";
    activeSubjects.forEach(s => {
        const span = document.createElement("span");
        span.className = "chip";
        span.style.padding = "6px 12px";
        span.style.background = "var(--surface2)";
        span.style.display = "inline-flex";
        span.style.alignItems = "center";
        span.style.gap = "8px";
        span.innerHTML = `${s} <span style="cursor:pointer;opacity:0.6" onclick="removeSubject('${s}')">✕</span>`;
        container.appendChild(span);
    });
    const addBtn = document.createElement("button");
    addBtn.className = "btn btn-ghost btn-sm";
    addBtn.onclick = addSubjectPrompt;
    addBtn.textContent = "＋ Add Subject";
    container.appendChild(addBtn);
}

function addSubjectPrompt() {
    const name = prompt("Enter subject name:");
    if (!name) return;
    if (activeSubjects.includes(name)) {
        alert("Subject already added.");
        return;
    }
    activeSubjects.push(name);
    saveSubjects();
    renderTopBar();
    renderTable();
}

function removeSubject(name) {
    if (!confirm(`Remove "${name}" and all associated marks?`)) return;
    activeSubjects = activeSubjects.filter(s => s !== name);
    saveSubjects();
    renderTopBar();
    renderTable();
}

function switchMode(mode) {
    viewMode = mode;
    document.getElementById("tab-entry").classList.toggle("active", mode === 'entry');
    document.getElementById("tab-display").classList.toggle("active", mode === 'display');
    renderTable();
}

async function setMark(short, subj, inp){
  const v = parseInt(inp.value);
  const max = getMax();
  if (!marksData[short]) marksData[short] = {};
  
  const student = students.find(st => st.short_code == short);
  if (!student) return;

  const examType = document.getElementById("exam-type").value;

  if(isNaN(v) || inp.value === ''){
      delete marksData[short][subj];
      inp.classList.remove("over-max");
      // Could add a DELETE API for single mark here
  } else if(v > max){
      inp.classList.add("over-max");
  } else {
      inp.classList.remove("over-max");
      marksData[short][subj] = v;
      // Sync to DB
      await saveMarksRecords([{
          student_id: student.id,
          subject: subj,
          exam_type: examType,
          score: v
      }]);
  }
  recalcStats();
  document.getElementById("notify-btn").disabled = Object.keys(marksData).length === 0;
}

async function clearStudentMarks(short) {
    if (!confirm("Clear all marks for this student?")) return;
    delete marksData[short];
    // Sync to DB (could add a clear API)
    renderTable();
}

function recalcStats(){
  const allScores = [];
  Object.values(marksData).forEach(stMarks => {
      Object.values(stMarks).forEach(m => allScores.push(m));
  });

  if(!allScores.length){
      ["s-avg","s-high","s-low","s-fail"].forEach(i => {
          const el = document.getElementById(i);
          if (el) el.textContent = "—";
      });
      return;
  }
  const max = getMax();
  const pcts = allScores.map(v => Math.round((v/max)*100));
  const avgEl = document.getElementById("s-avg");
  const oldAvg = parseInt(avgEl ? avgEl.textContent : 0) || 0;
  const newAvg = Math.round(pcts.reduce((a,b) => a+b,0) / pcts.length);
  animateValue("s-avg", oldAvg, newAvg, 300, true);
  updateCircle("avg", newAvg, 100);

  const highEl = document.getElementById("s-high");
  const oldHigh = parseInt(highEl ? highEl.textContent : 0) || 0;
  const newHigh = Math.max(...pcts);
  animateValue("s-high", oldHigh, newHigh, 300, true);
  updateCircle("high", newHigh, 100);

  const passCount = pcts.filter(p => p >= 40).length;
  const oldPass = parseInt(document.getElementById("s-pass").textContent) || 0;
  animateValue("s-pass", oldPass, passCount, 300);
  updateCircle("pass", passCount, (window.students || []).length, false);

  const failCount = pcts.filter(p => p < 40).length;
  const oldFail = parseInt(document.getElementById("s-fail").textContent) || 0;
  animateValue("s-fail", oldFail, failCount, 300);
  updateCircle("fail", failCount, (window.students || []).length, false);
}

function handleKeyNav(e) {
    const input = e.target;
    const row = parseInt(input.dataset.row);
    const col = parseInt(input.dataset.col);
    let nextRow = row;
    let nextCol = col;

    if (e.key === "ArrowDown" || e.key === "Enter") nextRow++;
    else if (e.key === "ArrowUp") nextRow--;
    else if (e.key === "ArrowRight") nextCol++;
    else if (e.key === "ArrowLeft") nextCol--;
    else return;

    if (e.key === "Enter") e.preventDefault();

    const nextInput = document.querySelector(`.score-inp[data-row="${nextRow}"][data-col="${nextCol}"]`);
    if (nextInput) nextInput.focus();
}

function recalcAll(){renderTable();}
function updateConfig(){loadData();} // Reload data from DB when exam type changes

function addExamTypePrompt() {
    const name = prompt("Enter new Exam Type name (e.g., Mid Term, Quiz 1):");
    if (!name || name.trim() === "") return;
    if (examTypes.includes(name.trim())) {
        alert("This exam type already exists.");
        return;
    }
    examTypes.push(name.trim());
    saveExamTypes();
    renderExamTypeSelect();
    document.getElementById("exam-type").value = name.trim();
    updateConfig();
    toast(`Added "${name.trim()}"`);
}

function removeExamTypePrompt() {
    const sel = document.getElementById("exam-type");
    const current = sel.value;
    if (!current) return;
    if (!confirm(`Remove "${current}" from the list? \n\nNote: Any marks already saved in the database for this type will remain there, but you won't be able to select this type anymore.`)) return;
    
    examTypes = examTypes.filter(et => et !== current);
    saveExamTypes();
    renderExamTypeSelect();
    updateConfig();
    toast(`Removed "${current}"`);
}

async function fillSample(){
  const samples = [42,47,38,50,29,44,35,48,41,45,37,49];
  const examType = document.getElementById("exam-type").value;
  const records = [];

  students.forEach((s,i) => {
    if (!marksData[s.short_code]) marksData[s.short_code] = {};
    activeSubjects.forEach(subj => {
        const score = Math.max(0, Math.min(getMax(), (samples[i%samples.length] || 40) - Math.floor(Math.random() * 10)));
        marksData[s.short_code][subj] = score;
        records.push({
            student_id: s.id,
            subject: subj,
            exam_type: examType,
            score: score
        });
    });
  });
  
  await saveMarksRecords(records);
  renderTable();
  document.getElementById("notify-btn").disabled = false;
  toast("Sample marks loaded and synced to database");
}

let sendingMode = localStorage.getItem("sending_mode") || "tabs";

function toggleSendingMode(mode) {
  sendingMode = mode;
  localStorage.setItem("sending_mode", mode);
  openModal(); // refresh modal
}

function openModal(){
  const exam = document.getElementById("exam-type").value;
  document.getElementById("modal-exam").textContent = exam;
  const list = document.getElementById("modal-list");
  
  list.innerHTML = `
    <div class="mode-select" style="margin-bottom:15px; padding-top:10px">
      <div class="mode-label">Sending Mode:</div>
      <div class="mode-btn-group">
        <button class="m-btn ${sendingMode === 'tabs' ? 'active' : ''}" onclick="toggleSendingMode('tabs')">📱 Tabs</button>
        <button class="m-btn ${sendingMode === 'auto' ? 'active' : ''}" onclick="toggleSendingMode('auto')">⚡ Auto (n8n)</button>
      </div>
    </div>
  `;
  
  let batchCount = 0;
  students.forEach(s => {
    const stMarks = marksData[s.short_code];
    if (!stMarks || Object.keys(stMarks).length === 0) return;
    const subjList = Object.keys(stMarks).filter(subj => activeSubjects.includes(subj));
    if (subjList.length === 0) return;

    batchCount++;
    const total = subjList.reduce((sum, subj) => sum + stMarks[subj], 0);
    const avgPct = Math.round((total / (subjList.length * getMax())) * 100);
    const gr = getGrade(avgPct);

    const div = document.createElement("div");
    div.className = "nrow";
    div.innerHTML = `
      <div class="ninfo">
        <div class="nname">${s.name} &nbsp;<span class="grade ${gr.cls}">${gr.g}</span></div>
        <div class="nmeta">${rollNo(s.short_code)} · Avg: ${avgPct}%</div>
      </div>
      <a class="wa-btn" href="#" onclick="sendSingle('${s.short_code}'); return false;">💬 Send</a>`;
    list.appendChild(div);
  });
  
  const btn = document.querySelector(".btn-wa-all");
  btn.textContent = sendingMode === 'auto' ? `⚡ Send ${batchCount} Reports Automatically` : `💬 Send ${batchCount} via WhatsApp Tabs`;
  
  document.getElementById("overlay").classList.add("show");
}

function closeModal(){document.getElementById("overlay").classList.remove("show");}

function sendSingle(short) {
    const s = window.students.find(st => st.short_code == short);
    const exam = document.getElementById("exam-type").value;
    const stMarks = marksData[short];
    const subjList = Object.keys(stMarks).filter(subj => activeSubjects.includes(subj));
    let markSummary = subjList.map(subj => `${subj}: ${stMarks[subj]}/${getMax()}`).join(", ");
    const total = subjList.reduce((sum, subj) => sum + stMarks[subj], 0);
    const avgPct = Math.round((total / (subjList.length * getMax())) * 100);
    const gr = getGrade(avgPct);
    const msg = `Dear Parent,\n\nYour ward *${s.name}* (${rollNo(s.short_code)}) has scored the following in *${exam}*:\n${markSummary}\nTotal: ${total}/${subjList.length*getMax()} (${avgPct}%) — Grade: *${gr.g}*\n\nRegards,\n${BATCH.deptName} Department`;
    window.open(`https://wa.me/${s.parent_phone}?text=${encodeURIComponent(msg)}`, "_blank");
}

async function sendAll(){
  const exam = document.getElementById("exam-type").value;
  const toSend = (window.students || []).filter(s => {
      const m = marksData[String(s.short_code)];
      return m && Object.keys(m).some(subj => activeSubjects.includes(subj));
  });

  if (sendingMode === 'auto') {
    const url = localStorage.getItem("attendance_webhook_url");
    if (!url) { toast("⚠️ Configure Webhook in WhatsApp Setup first!"); return; }
    
    const btn = document.querySelector(".btn-wa-all");
    btn.disabled = true;
    btn.textContent = "⚡ Sending to Webhook...";

    const payload = {
      type: "marks_batch",
      exam: exam,
      dept: BATCH.deptName,
      data: toSend.map(s => {
        const stMarks = marksData[s.short_code];
        const subjs = Object.keys(stMarks).filter(subj => activeSubjects.includes(subj));
        const total = subjs.reduce((sum, subj) => sum + stMarks[subj], 0);
        const maxT = subjs.length * getMax();
        const avg = Math.round((total / maxT) * 100);
        return {
          name: s.name,
          roll: rollNo(s.short_code),
          phone: s.parent_phone,
          marks: stMarks,
          total: `${total}/${maxT}`,
          avg: avg + "%",
          grade: getGrade(avg).g
        };
      })
    };

    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (r.ok) {
            showToast(`✅ ${toSend.length} reports sent automatically!`);
            closeModal();
        } else { toast("❌ Webhook error: " + r.status); }
    } catch(e) {
        toast("❌ Connection failed");
    }
    return;
  }

  let sentCount = 0;
  toSend.forEach((s) => {
    const stMarks = marksData[s.short_code];
    const subjList = Object.keys(stMarks).filter(subj => activeSubjects.includes(subj));
    let markSummary = subjList.map(subj => `${subj}: ${stMarks[subj]}/${getMax()}`).join(", ");
    const total = subjList.reduce((sum, subj) => sum + stMarks[subj], 0);
    const avgPct = Math.round((total / (subjList.length * getMax())) * 100);
    const gr = getGrade(avgPct);
    const msg = `Dear Parent,\n\nYour ward *${s.name}* (${rollNo(s.short_code)}) has scored the following in *${exam}*:\n${markSummary}\nTotal: ${total}/${subjList.length*getMax()} (${avgPct}%) — Grade: *${gr.g}*\n\nRegards,\n${BATCH.deptName} Department`;
    
    setTimeout(() => window.open(`https://wa.me/${s.parent_phone}?text=${encodeURIComponent(msg)}`, "_blank"), sentCount * 400);
    sentCount++;
  });
  closeModal();
  toast(`Opening WhatsApp for ${sentCount} parents...`);
}

function showToast(msg) { toast(msg); }

function toast(msg){
  const el = document.getElementById("tmsg");
  if (!el) return;
  el.textContent = msg;
  const t = document.getElementById("toast");
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}

document.addEventListener("DOMContentLoaded", initMarks);

