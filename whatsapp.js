const templates={
  absent:`Dear Parent,\n\nYour ward *{{name}}* ({{roll_no}}) was marked *absent* on {{date}} for the subject *{{subject}}*.\n\nPlease contact the class coordinator for more details.\n\n— {{department}} Department`,
  marks:`Dear Parent,\n\nYour ward *{{name}}* ({{roll_no}}) scored *{{marks}}/{{max_marks}}* — Grade *{{grade}}* in *{{subject}}* on {{date}}.\n\nRegards,\n— {{department}} Department`,
  od:`Dear Parent,\n\nYour ward *{{name}}* ({{roll_no}}) was marked *On Duty (OD)* on {{date}} for *{{subject}}*.\n\nThis is for your information.\n\n— {{department}} Department`,
};
let currentTmpl='absent';

function switchTmpl(key){
  currentTmpl=key;
  document.querySelectorAll(".ttab").forEach(t=>t.classList.remove("active"));
  const idx = ['absent','marks','od'].indexOf(key);
  if(idx !== -1) document.querySelectorAll(".ttab")[idx].classList.add("active");
  document.getElementById("tmpl-area").value=templates[key];
}

function insertVar(v){
  const ta=document.getElementById("tmpl-area");
  const pos=ta.selectionStart;
  ta.value=ta.value.slice(0,pos)+v+ta.value.slice(pos);
  ta.focus();
  ta.selectionStart=ta.selectionEnd=pos+v.length;
}

function saveTemplate(){
  templates[currentTmpl]=document.getElementById("tmpl-area").value;
  toast("Template saved","green");
}

function previewTemplate(){
  const preview=templates[currentTmpl]
    .replace(/{{name}}/g,"Ravi Kumar")
    .replace(/{{roll_no}}/g,"DS22AI101")
    .replace(/{{date}}/g,new Date().toLocaleDateString("en-IN"))
    .replace(/{{subject}}/g,"Data Structures")
    .replace(/{{marks}}/g,"42")
    .replace(/{{max_marks}}/g,"50")
    .replace(/{{grade}}/g,"B+")
    .replace(/{{department}}/g,"AI & DS");
  alert("Preview:\n\n"+preview);
}

function switchTab(id){
  document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.getElementById("panel-"+id).classList.add("active");
  if (event) event.target.classList.add("active");
}

async function checkCloudStatus() {
  try {
    const res = await fetch('/api/whatsapp-config');
    const config = await res.json();
    
    const b_token = document.getElementById("status-token");
    const b_phone = document.getElementById("status-phone");
    const b_auto = document.getElementById("status-auto");
    const pill = document.getElementById("cloud-pill");
    const box = document.getElementById("cloud-status-box");

    if (config.hasToken) {
      b_token.textContent = "Valid";
      b_token.className = "status-badge success";
    } else {
      b_token.textContent = "Missing";
      b_token.className = "status-badge error";
    }

    if (config.hasPhoneId) {
      b_phone.textContent = "Configured";
      b_phone.className = "status-badge success";
    } else {
      b_phone.textContent = "Missing";
      b_phone.className = "status-badge error";
    }

    if (config.hasToken && config.hasPhoneId) {
      b_auto.textContent = "Active";
      b_auto.className = "status-badge success";
      pill.style.display = "flex";
      box.innerHTML = `<div style="font-size:48px">✅</div><div class="qr-label" style="color:var(--green)">System Live</div>`;
    } else {
      b_auto.textContent = "Disabled";
      b_auto.className = "status-badge busy";
      pill.style.display = "none";
      box.innerHTML = `<div style="font-size:48px">⚠️</div><div class="qr-label" style="color:var(--amber)">Setup Required</div>`;
    }
  } catch (e) {
    console.error("Failed to fetch WhatsApp config:", e);
  }
}

async function testCloudAPI() {
  toast("Sending test message...", "blue");
  try {
    const res = await fetch('/api/test-whatsapp', { method: 'POST' });
    if (res.ok) {
      toast("✓ Test message sent!", "green");
    } else {
      const err = await res.json();
      toast("❌ Error: " + (err.error || "Failed"), "red");
    }
  } catch (e) {
    toast("❌ Connection failed", "red");
  }
}

function toast(msg,color="green"){
  const t = document.getElementById("toast");
  const m = document.getElementById("tmsg");
  if(!t || !m) return;
  m.textContent=msg;
  const d=t.querySelector(".tdot");
  const c={"green":"#25D366","amber":"#f59e0b","blue":"#3b82f6","red":"#ef4444"}[color]||"#25D366";
  if(d) d.style.background=c;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2800);
}

document.addEventListener("DOMContentLoaded", () => {
    switchTmpl('absent');
    checkCloudStatus();
});
