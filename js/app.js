// Horari — render per classe o per professor/a
// Fitxers: data/classes.json, data/professors.json, data/assignatures.json, data/sessions.json

const DAYS = ["", "Dilluns","Dimarts","Dimecres","Dijous","Divendres"]; // 1..5

let MODE = "class"; // "class" | "teacher"
let classes = [];
let professors = [];
let sessions = [];
let subjects = [];
let subjectsById = {};
let cycles = {}; // codi -> {abbr, fullName}

// === Colors: auto-generated from subjectId ===
function hashStr(s){ let h=5381; for(let i=0;i<s.length;i++){ h=((h<<5)+h)+s.charCodeAt(i);} return h>>>0; }
const PALETTE=[
  {bg:'#E8F1FF',border:'#C9DFFF'},{bg:'#EAFBF1',border:'#C8F2DD'},
  {bg:'#FFF2E5',border:'#FFD7B8'},{bg:'#F8EAFE',border:'#EBCDFD'},
  {bg:'#FDECF0',border:'#F8CDD6'},{bg:'#EAF7FE',border:'#CDEBFD'},
  {bg:'#EFFFF4',border:'#D4FBE3'},{bg:'#FFFDEB',border:'#FFF4B8'},
  {bg:'#E9F5FF',border:'#CFE9FF'},{bg:'#F2E9FF',border:'#E0CFFF'},
  {bg:'#FFE9F7',border:'#FFCFEA'},{bg:'#E9FFF7',border:'#CFF7EA'}
];

function colorForSubjectItem(s){
  const code = s.subjectId || '';
  const i = hashStr(code) % PALETTE.length;
  const {bg,border} = PALETTE[i];
  return { bg, border, text:'#1f2937' };
}

async function fetchJSON(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`No s'ha pogut carregar ${url}`);
  return r.json();
}

async function loadData(){
  classes = await fetchJSON("data/classes.json");
  professors = await fetchJSON("data/professors.json");
  subjects = await fetchJSON("data/assignatures.json");
  sessions = await fetchJSON("data/sessions.json");

  subjects.forEach(s => subjectsById[s.id] = s);
}

function escapeHtml(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function professorName(id){
  const p = professors.find(p=>p.id===id);
  return p ? p.name : id;
}
function groupName(id){
  const c = classes.find(c=>c.id===id);
  return c ? c.name : id;
}

function renderSession(s){
  const subjObj = subjectsById[s.subjectId];
  const subjText = subjObj ? `${subjObj.id}. ${subjObj.name}` : s.subjectId;

  const room = s.room ? ` · ${escapeHtml(s.room)}` : "";
  const extra = MODE === "class" ? professorName(s.teacherId) : groupName(s.groupId);
  const c = colorForSubjectItem(s);
  const style = `style="background:${c.bg}; border:1px solid ${c.border}; padding:8px 10px; border-radius:8px;"`;

  return `<div ${style}>
    <strong>${escapeHtml(subjText)}</strong>
    — ${escapeHtml(extra)}${room}
  </div>`;
}

// La resta del fitxer (filtres, render taula, events) NO canvia
