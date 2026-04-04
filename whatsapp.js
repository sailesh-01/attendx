const templates={
  absent:`Dear Parent,\n\nYour ward *{{name}}* ({{roll_no}}) was marked *absent* on {{date}} for the subject *{{subject}}*.\n\nPlease contact the class coordinator for more details.\n\n— {{department}} Department`,
  marks:`Dear Parent,\n\nYour ward *{{name}}* ({{roll_no}}) scored *{{marks}}/{{max_marks}}* — Grade *{{grade}}* in *{{subject}}* on {{date}}.\n\nRegards,\n— {{department}} Department`,
  od:`Dear Parent,\n\nYour ward *{{name}}* ({{roll_no}}) was marked *On Duty (OD)* on {{date}} for *{{subject}}*.\n\nThis is for your information.\n\n— {{department}} Department`,
};
let currentTmpl='absent';

function switchTmpl(key){
  currentTmpl=key;
  document.querySelectorAll(".ttab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".ttab")[['absent','marks','od'].indexOf(key)].classList.add("active");
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
    .replace(/{{roll_no}}/g,rollNo("101"))
    .replace(/{{date}}/g,new Date().toLocaleDateString("en-IN"))
    .replace(/{{subject}}/g,"Data Structures")
    .replace(/{{marks}}/g,"42")
    .replace(/{{max_marks}}/g,"50")
    .replace(/{{grade}}/g,"B+")
    .replace(/{{department}}/g,BATCH.deptName);
  alert("Preview:\n\n"+preview);
}

function switchTab(id){
  document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.getElementById("panel-"+id).classList.add("active");
  if (event) event.target.classList.add("active");
}

function updateStatusUI(connected) {
  const pill=document.getElementById("status-pill");
  const txt=document.getElementById("status-text");
  const qr=document.getElementById("qr-box");
  if (!pill || !txt || !qr) return;

  if (connected) {
    pill.className="status-pill sp-connected";
    txt.textContent="✓ Connected — WhatsApp Web ready";
    qr.innerHTML=`
      <div style="font-size:48px; margin-bottom:5px">✅</div>
      <div class="qr-label" style="color:var(--green); font-weight:600">Connected</div>
      <div style="font-size:10px; color:var(--muted); margin-bottom:10px">Session Active</div>
      <button class="btn btn-ghost" onclick="disconnect()" style="padding:4px 10px; font-size:10px; border-color:rgba(239,68,68,0.2); color:var(--red)">Disconnect</button>
    `;
  } else {
    pill.className="status-pill sp-waiting";
    txt.textContent="Waiting for scan…";
    qr.innerHTML=`
      <div class="qr-img">📱</div>
      <div class="qr-label">Scan QR Code</div>
      <button class="btn btn-wa" onclick="simulateConnect()" style="padding:6px 14px; font-size:12px; margin-top:8px">Connect Now</button>
    `;
  }
}

function simulateConnect(){
  const pill=document.getElementById("status-pill");
  const txt=document.getElementById("status-text");
  const qr=document.getElementById("qr-box");
  
  pill.className="status-pill sp-waiting";
  txt.textContent="Scanning…";
  qr.innerHTML=`
    <div class="qr-img" style="animation: pulse 1s infinite">🔍</div>
    <div class="qr-label">Authenticating…</div>
  `;
  
  setTimeout(()=>{
    localStorage.setItem("wa_connected", "true");
    updateStatusUI(true);
    toast("WhatsApp Web linked successfully!","green");
  },1800);
}

function disconnect() {
  if (!confirm("Are you sure you want to disconnect?")) return;
  localStorage.removeItem("wa_connected");
  updateStatusUI(false);
  toast("WhatsApp session cleared","amber");
}

function testWebhook(){
  const url=document.getElementById("webhook-url").value;
  if(!url){toast("Enter a webhook URL first","amber");return;}
  toast("Sending test payload to n8n…","blue");
  
  // Real test
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true, message: "Hello from AttendX" })
  })
  .then(r => {
    if(r.ok) toast("✓ Webhook responded 200 OK","green");
    else toast("⚠️ Webhook returned error " + r.status, "amber");
  })
  .catch(e => toast("❌ Connection failed", "red"));
}

function saveConfig(){
  const url = document.getElementById("webhook-url").value;
  localStorage.setItem("attendance_webhook_url", url);
  toast("Configuration saved to browser","green");
}

function toast(msg,color="green"){
  document.getElementById("tmsg").textContent=msg;
  const d=document.getElementById("tdot");
  const c={"green":"#25D366","amber":"#f59e0b","blue":"#3b82f6"}[color]||"#25D366";
  d.style.background=c;
  const t=document.getElementById("toast");t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2800);
}

document.addEventListener("DOMContentLoaded", () => {
    switchTmpl('absent');
    if (localStorage.getItem("wa_connected") === "true") {
        updateStatusUI(true);
    }
});
