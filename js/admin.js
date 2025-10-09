// Admin editor for sessions.json with subject dropdown and time modes (time / slots)
const DAYS = [
  {id:1,name:"Dilluns"},
  {id:2,name:"Dimarts"},
  {id:3,name:"Dimecres"},
  {id:4,name:"Dijous"},
  {id:5,name:"Divendres"}
];

let classes=[], professors=[], assignatures=[], sessions=[];
let filterMode = "all", filterValue = "";
let timeMode = "time"; // "time" | "slots"
let slots = []; // [{start, end}]

const els = {
  loadServerBtn: document.getElementById("loadServerBtn"),
  fileInput: document.getElementById("fileInput"),
  addRowBtn: document.getElementById("addRowBtn"),
  exportBtn: document.getElementById("exportBtn"),
  validateBtn: document.getElementById("validateBtn"),
  tableBody: document.querySelector("#table tbody"),
  status: document.getElementById("status"),
  rowCount: document.getElementById("rowCount"),
  warnCount: document.getElementById("warnCount"),
  report: document.getElementById("report"),
  filterMode: document.getElementById("filterMode"),
  filterSelect: document.getElementById("filterSelect"),
  clearFilter: document.getElementById("clearFilter"),
  timeMode: document.getElementById("timeMode"),
};

(async function init(){
  [classes, professors, assignatures] = await Promise.all([
    fetch("data/classes.json").then(r=>r.json()).catch(()=>[]),
    fetch("data/professors.json").then(r=>r.json()).catch(()=>[]),
    fetch("data/assignatures.json").then(r=>r.json()).catch(()=>[]),
  ]);
  buildFilterSelect();
  bindEvents();
  setStatus("Llest. Carrega o importa sessions.json");
})();

function bindEvents(){
  els.timeMode.addEventListener("change", ()=>{
    timeMode = els.timeMode.value;
    render();
  });

  els.loadServerBtn.addEventListener("click", async ()=>{
    try{
      sessions = await fetch("data/sessions.json").then(r=>r.json());
      computeSlots();
      sortSessions();
      render();
      setStatus("Carregat del servidor", "ok");
    }catch(e){
      setStatus("No s'ha pogut carregar data/sessions.json", "danger");
    }
  });
  els.fileInput.addEventListener("change", async (e)=>{
    const file = e.target.files[0];
    if (!file) return;
    try{
      const text = await file.text();
      sessions = JSON.parse(text);
      computeSlots();
      sortSessions();
      render();
      setStatus("Importat des de fitxer", "ok");
    }catch(e){
      setStatus("Error d'importació: JSON no vàlid", "danger");
    }finally{
      e.target.value = "";
    }
  });
  els.addRowBtn.addEventListener("click", ()=>{
    sessions.push({day:1,start:"08:30",end:"09:25",subject:assignatures[0]?.id||"",groupId:classes[0]?.id||"",teacherId:professors[0]?.id||"",room:""});
    render();
  });
  els.exportBtn.addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(sessions,null,2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sessions.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  els.validateBtn.addEventListener("click", ()=>{
    const warnings = validateOverlaps(sessions);
    showWarnings(warnings);
  });
  els.filterMode.addEventListener("change", ()=>{
    filterMode = els.filterMode.value;
    buildFilterSelect();
    render();
  });
  els.filterSelect.addEventListener("change", ()=>{
    filterValue = els.filterSelect.value;
    render();
  });
  els.clearFilter.addEventListener("click", ()=>{
    filterMode="all"; filterValue="";
    els.filterMode.value="all";
    buildFilterSelect();
    render();
  });
}

function buildFilterSelect(){
  let items = [];
  if (filterMode === "class") items = classes.map(c=>({id:c.id, name:c.name}));
  if (filterMode === "teacher") items = professors.map(t=>({id:t.id, name:t.name}));
  els.filterSelect.innerHTML = `<option value="">— Selecciona —</option>` + items.map(i=>`<option value="${i.id}">${i.name}</option>`).join("");
  els.filterSelect.disabled = (filterMode==="all");
}

function render(){
  const list = sessions
    .map((s,idx)=>({...s, __idx: idx}))
    .filter(s => {
      if (filterMode==="class" && filterValue) return s.groupId === filterValue;
      if (filterMode==="teacher" && filterValue) return s.teacherId === filterValue;
      return true;
    });

  els.tableBody.innerHTML = list.map(rowHtml).join("");
  els.rowCount.textContent = String(list.length);

  // bind change events for inputs
  for (const tr of els.tableBody.querySelectorAll("tr")){
    const idx = Number(tr.dataset.idx);
    tr.querySelectorAll("select, input").forEach(input=>{
      input.addEventListener("change", ()=> handleCellChange(idx, input));
    });
    const delBtn = tr.querySelector(".del");
    const dupBtn = tr.querySelector(".dup");
    delBtn.addEventListener("click", ()=>{ sessions.splice(idx,1); render(); });
    dupBtn.addEventListener("click", ()=>{ sessions.splice(idx+1,0, JSON.parse(JSON.stringify(sessions[idx])) ); render(); });
  }


  // attach timepicker buttons
  for (const btn of els.tableBody.querySelectorAll(".tpick")){
    const tr = btn.closest("tr");
    const idx = Number(tr.dataset.idx);
    const which = btn.dataset.which;
    btn.addEventListener("click", async ()=>{
      try{
        const current = sessions[idx][which] || "08:30";
        const val = await TimePicker.pick({ value: current, title: which==="start" ? "Hora d'inici" : "Hora de fi", step: 5 });
        sessions[idx][which] = val;
        sortSessions();
        render();
      }catch(e){/*cancelled*/}
    });
  }
  // show last validation state (optional)
  const warnings = validateOverlaps(list);
  showWarnings(warnings, /*silent=*/true);
  applyInlineWarnings(warnings, list);

}

function rowHtml(s){
  return `<tr data-idx="${s.__idx||s.idx||0}">
    <td>${selectDay(s.day)}</td>
    ${timeCellStart(s)}
    ${timeCellEnd(s)}
    <td>${selectSubject(s.subject)}</td>
    <td>${selectClass(s.groupId)}</td>
    <td>${selectTeacher(s.teacherId)}</td>
    <td><input type="text" value="${escapeHtml(s.room||"")}" data-field="room" placeholder="Aula"></td>
    <td class="nowrap"><button class="iconbtn dup" title="Duplica" aria-label="Duplica"><svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button> <button class="iconbtn del" title="Elimina" aria-label="Elimina"><svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 7h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-3h6l1 1h4v2H4V5h4l1-1z"/></svg></button></td>
  </tr>`;
}

function timeCellStart(s){
  if (timeMode === "slots"){
    const k = `${s.start}-${s.end}`;
    return `<td><select name="slot">${slots.map(slot=>{
      const key = `${slot.start}-${slot.end}`;
      return `<option value="${key}" ${k===key?"selected":""}>${slot.start}–${slot.end}</option>`;
    }).join("")}</select></td>`;
  }
  return `<td><span class="timewrap"><input type="time" value="${s.start||""}" data-field="start" required> <button class="btn tpick" data-which="start" title="Selecciona amb rellotge">🕒</button></span></td>`;
}

function timeCellEnd(s){
  if (timeMode === "slots"){
    return `<td><input type="time" value="${s.end||""}" disabled></td>`;
  }
  return `<td><span class="timewrap"><input type="time" value="${s.end||""}" data-field="end" required> <button class="btn tpick" data-which="end" title="Selecciona amb rellotge">🕒</button></span></td>`;
}

function timeCells(s){
  if (timeMode === "slots"){
    const k = `${s.start}-${s.end}`;
    return `<select name="slot">${slots.map(slot=>{
      const key = `${slot.start}-${slot.end}`;
      return `<option value="${key}" ${k===key?"selected":""}>${slot.start}–${slot.end}</option>`;
    }).join("")}</select>`;
  }
  // default: time inputs
  return `<span class="timewrap"><input type="time" value="${s.start||""}" data-field="start" required> <button class="btn tpick" data-which="start" title="Selecciona amb rellotge">🕒</button></span>`+
         `<span class="timewrap"><input type="time" value="${s.end||""}" data-field="end" required> <button class="btn tpick" data-which="end" title="Selecciona amb rellotge">🕒</button></span>`;
}

function handleCellChange(idx, input){
  const field = input.dataset.field;
  if (!field){
    const name = input.name;
    if (name==="day") sessions[idx].day = Number(input.value||"1");
    if (name==="groupId") sessions[idx].groupId = input.value;
    if (name==="teacherId") sessions[idx].teacherId = input.value;
    if (name==="subject"){
      if (input.value === "__NEW__"){
        const v = prompt("Nova assignatura:");
        if (v && v.trim()){
          assignatures.push({id:v.trim(), name:v.trim()});
          sessions[idx].subject = v.trim();
        }
      }else{
        sessions[idx].subject = input.value;
      }
    }
    if (name==="slot"){
      const [st,en] = input.value.split("-");
      sessions[idx].start = st;
      sessions[idx].end = en;
    }
  }else{
    sessions[idx][field] = input.value;
  }
  sortSessions();
  render();
}

function selectDay(value){
  return `<select name="day">${DAYS.map(d=>`<option value="${d.id}" ${Number(value)===d.id?"selected":""}>${d.name}</option>`).join("")}</select>`;
}
function selectClass(value){
  return `<select name="groupId">${classes.map(c=>`<option value="${c.id}" ${value===c.id?"selected":""}>${c.name}</option>`).join("")}</select>`;
}
function selectTeacher(value){
  return `<select name="teacherId">${professors.map(t=>`<option value="${t.id}" ${value===t.id?"selected":""}>${t.name}</option>`).join("")}</select>`;
}
function selectSubject(value){
  const opts = assignatures.map(s=>`<option value="${s.id}" ${value===s.id?"selected":""}>${s.name}</option>`).join("");
  return `<select name="subject">${opts}<option value="__NEW__">+ Nova…</option></select>`;
}

function setStatus(msg, kind){
  els.status.textContent = msg;
  els.status.classList.remove("ok","danger");
  if (kind) els.status.classList.add(kind);
}

function escapeHtml(x){
  return (x??"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function sortSessions(){
  sessions.sort((a,b)=> (a.day-b.day) || a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.subject.localeCompare(b.subject));
}

function computeSlots(){
  const set = new Set();
  for (const s of sessions){
    if (s.start && s.end) set.add(`${s.start}-${s.end}`);
  }
  const arr = Array.from(set).map(k=>{
    const [start,end]=k.split("-"); return {start,end};
  }).sort((a,b)=> a.start.localeCompare(b.start));
  // Fallback default slots if none present
  slots = arr.length ? arr : [
    {start:"08:30", end:"09:25"},
    {start:"09:25", end:"10:20"},
    {start:"10:20", end:"11:15"},
    {start:"11:45", end:"12:40"},
    {start:"12:40", end:"13:35"},
    {start:"13:35", end:"14:30"},
  ];
}

// validation: overlaps by group OR teacher within same day and time range
function validateOverlaps(list){
  const warns = [];
  const items = list.map((s,i)=>({...s, __line:i}));
  const toMin = (hhmm)=>{
    const [h,m] = (hhmm||"00:00").split(":").map(Number);
    return (h*60 + m);
  };
  function overlaps(a,b){
    const a1 = toMin(a.start), a2 = toMin(a.end);
    const b1 = toMin(b.start), b2 = toMin(b.end);
    return Math.max(a1,b1) < Math.min(a2,b2);
  }
  for (let i=0;i<items.length;i++){
    for (let j=i+1;j<items.length;j++){
      const a = items[i], b = items[j];
      if (a.day!==b.day) continue;
      if (overlaps(a,b)){
        if (a.groupId===b.groupId){
          warns.push({type:"group", groupId:a.groupId, a, b});
        }
        if (a.teacherId===b.teacherId){
          warns.push({type:"teacher", teacherId:a.teacherId, a, b});
        }
      }
    }
  }
  for (const s of items){
    if (!s.start || !s.end || s.start>=s.end){
      warns.push({type:"invalid-time", s});
    }
    if (![1,2,3,4,5].includes(Number(s.day))) warns.push({type:"invalid-day", s});
    if (!classes.find(c=>c.id===s.groupId)) warns.push({type:"unknown-class", s});
    if (!professors.find(t=>t.id===s.teacherId)) warns.push({type:"unknown-teacher", s});
  }
  return warns;
}

function showWarnings(warnings, silent=false){
  els.warnCount.textContent = String(warnings.length);
  const lines = warnings.map(w=>{
    if (w.type==="group"){
      return `Solapament per <strong>classe ${escapeHtml(w.groupId)}</strong> el dia <strong>${dayName(w.a.day)}</strong> entre <code>${w.a.start}-${w.a.end}</code> i <code>${w.b.start}-${w.b.end}</code> (${escapeHtml(w.a.subject)} vs ${escapeHtml(w.b.subject)})`;
    }
    if (w.type==="teacher"){
      return `Solapament per <strong>professor/a ${escapeHtml(w.teacherId)}</strong> el dia <strong>${dayName(w.a.day)}</strong> entre <code>${w.a.start}-${w.a.end}</code> i <code>${w.b.start}-${w.b.end}</code> (${escapeHtml(w.a.subject)} vs ${escapeHtml(w.b.subject)})`;
    }
    if (w.type==="invalid-time"){
      return `Hora no vàlida a <strong>${escapeHtml(w.s.subject||"(sense nom)")}</strong> (${dayName(w.s.day)}): <code>${w.s.start||"?"}-${w.s.end||"?"}</code>`;
    }
    if (w.type==="invalid-day"){
      return `Dia no vàlid a <strong>${escapeHtml(w.s.subject||"(sense nom)")}</strong>: <code>${w.s.day}</code>`;
    }
    if (w.type==="unknown-class"){
      return `Classe desconeguda: <code>${escapeHtml(w.s.groupId||"(buit)")}</code>`;
    }
    if (w.type==="unknown-teacher"){
      return `Professor/a desconegut/da: <code>${escapeHtml(w.s.teacherId||"(buit)")}</code>`;
    }
    return JSON.stringify(w);
  });
  els.report.innerHTML = warnings.length
    ? `<h2>Informe</h2><ul>${lines.map(li=>`<li>${li}</li>`).join("")}</ul>`
    : (silent ? "" : `<p class="ok">Sense avisos. ✔</p>`);
}

function dayName(d){ return DAYS.find(x=>x.id===Number(d))?.name || String(d); }


function applyInlineWarnings(warnings, list){
  // Clear previous marks
  els.tableBody.querySelectorAll('td.err').forEach(td=> td.classList.remove('err'));

  // Map: row index in current filtered list -> <tr>
  const rows = Array.from(els.tableBody.querySelectorAll('tr'));

  // Utility: mark a cell by (row, col)
  function mark(rowIdx, colIdx){
    const tr = rows[rowIdx];
    if (!tr) return;
    const td = tr.children[colIdx];
    if (!td) return;
    td.classList.add('err');
  }

  // Column indices: 0=Dia, 1=Inici, 2=Fi, 3=Assignatura, 4=Classe, 5=Professor/a, 6=Aula, 7=Accions
  for (const w of warnings){
    if (w.type === "group"){
      const a = w.a.__line ?? w.a.__idx ?? null;
      const b = w.b.__line ?? w.b.__idx ?? null;
      if (a!=null){ mark(a,1); mark(a,2); mark(a,4); }
      if (b!=null){ mark(b,1); mark(b,2); mark(b,4); }
    }else if (w.type === "teacher"){
      const a = w.a.__line ?? w.a.__idx ?? null;
      const b = w.b.__line ?? w.b.__idx ?? null;
      if (a!=null){ mark(a,1); mark(a,2); mark(a,5); }
      if (b!=null){ mark(b,1); mark(b,2); mark(b,5); }
    }else if (w.type === "invalid-time"){
      const a = w.s.__line ?? w.s.__idx ?? null;
      if (a!=null){ mark(a,1); mark(a,2); }
    }else if (w.type === "invalid-day"){
      const a = w.s.__line ?? w.s.__idx ?? null;
      if (a!=null){ mark(a,0); }
    }else if (w.type === "unknown-class"){
      const a = w.s.__line ?? w.s.__idx ?? null;
      if (a!=null){ mark(a,4); }
    }else if (w.type === "unknown-teacher"){
      const a = w.s.__line ?? w.s.__idx ?? null;
      if (a!=null){ mark(a,5); }
    }else if (w.type === "empty-subject"){
      const a = w.s.__line ?? w.s.__idx ?? null;
      if (a!=null){ mark(a,3); }
    }
  }
}
