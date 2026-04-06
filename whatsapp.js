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
  if(!ta) return;
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

function testWebhook(){
  const url=document.getElementById("webhook-url").value;
  if(!url){toast("Enter a webhook URL first","amber");return;}
  toast("Sending test payload to n8n…","blue");
  
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true, message: "Hello from AttendX Manual Mode" })
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
  toast("n8n configuration saved","green");
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
    const savedUrl = localStorage.getItem("attendance_webhook_url");
    if(savedUrl) document.getElementById("webhook-url").value = savedUrl;
});
