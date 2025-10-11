// Horari — render per classe o per professor/a
// Fitxers: data/classes.json, data/professors.json, data/sessions.json, data/colors.json

const DAYS = ["", "Dilluns","Dimarts","Dimecres","Dijous","Divendres"]; // 1..5

let MODE = "class"; // "class" | "teacher"
let classes = [];
let professors = [];
let sessions = [];
let subjectColors = {}; // subject -> hex
let cycles = {}; // codi -> {abbr, fullName}


// === Colors: auto-generated from subject code (no colors.json needed) ===
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
  const raw = String(s.subject||'').trim();
  const code = raw.split('.')[0].trim() || raw; // '0485. Programació' -> '0485'
  const i = hashStr(code) % PALETTE.length;
  const {bg,border} = PALETTE[i];
  return { bg, border, text:'#1f2937' };
}
const modeButtons = document.getElementById("modeButtons");
const selectEl = document.getElementById("entitySelect");
const selectLabel = document.getElementById("selectLabel");
const renderBtn = document.getElementById("renderBtn");
const scheduleDiv = document.getElementById("schedule");
const brandTitle = document.querySelector(".brand__title");
const trimSelect = document.getElementById("trimSelect");
const brandSubtitle = document.getElementById("brand-subtitle");
let TRIM = 1;

modeButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  [...modeButtons.querySelectorAll(".btn")].forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  MODE = btn.dataset.mode;
  refreshSelect();
});

renderBtn.addEventListener("click", () => {
  const value = selectEl.value;
  if (!value) return;
  const filtered = filterSessions(MODE, value);
  renderSchedule(filtered);
});

const PARAMS = new URLSearchParams(location.search);

(async function init() {
  // Carreguem dades
  classes = await fetch("data/classes.json").then(r=>r.json());
  // professors (amb fallback a teachers si cal)
  try {
    professors = await fetch("data/professors.json").then(r=>r.json());
  } catch {
    try { professors = await fetch("data/teachers.json").then(r=>r.json()); } catch { professors = []; }
  }
  sessions = await fetch("data/sessions.json").then(r=>r.json());
    cycles = await fetch("data/cicles.json").then(r=>r.json()).catch(()=> ({}));

  refreshSelect();
  autoRenderFromParams();
  updateBrandHeader();
})();

function refreshSelect() {
  const items = MODE === "class" ? classes : professors;
  selectLabel.textContent = MODE === "class" ? "Classe:" : "Professor:";
  selectEl.innerHTML = `<option value="">— Selecciona —</option>` +
    items.map(i => `<option value="${i.id}">${i.name}</option>`).join("");
  scheduleDiv.innerHTML = ""; // neteja
}

function filterSessions(mode, id) {
  return sessions.filter(s => {
    const byTrim = (s.trimester ?? 1) === TRIM;
    if (!byTrim) return false;

    if (s.type === 'break') {
      if (mode === 'class') {
        return (s.groupId === id) || (s.groupId === '*') || (!s.groupId);
      } else {
        return (s.teacherId === id) || (s.teacherId === '*') || (!s.teacherId);
      }
    }
    return mode === "class" ? s.groupId === id : s.teacherId === id;
  });
}

function renderSchedule(list) {
  if (!list || !list.length) {
    scheduleDiv.innerHTML = `<p class="muted">No hi ha sessions per a la selecció.</p>`;
    return;
  }

  // 1) time slots uniques, a partir de les sessions mostres
  const key = s => `${s.start}-${s.end}`;
  const slots = Array.from(new Set(list.map(key)))
    .map(k => ({ start: k.split("-")[0], end: k.split("-")[1] }))
    .sort((a,b) => a.start.localeCompare(b.start));

  // 2) per dia + franja
  const byDaySlot = {};
  for (const s of list) {
    const k = key(s);
    byDaySlot[s.day] ??= {};
    byDaySlot[s.day][k] ??= [];
    byDaySlot[s.day][k].push(s);
  }

  // 3) render graella
  const cols = 1 + 5; // hores + dies
  const grid = document.createElement("div");
  grid.className = "grid";
//   grid.style.gridTemplateColumns = `minmax(var(--time-col,110px), auto) repeat(5, minmax(160px, 1fr))`;
  grid.style.gridTemplateColumns = `var(--time-col, 84px) repeat(5, minmax(160px, 1fr))`;

  // Capçalera (Afegim data-day per a highlight.js)
  grid.appendChild(hdrCell("Hora"));
  for (let d=1; d<=5; d++) grid.appendChild(hdrCell(DAYS[d], "", {"data-day": String(d)}));

  // Cos (Afegim data-slot i data-day per a highlight.js)
  for (const slot of slots) {
    const slotKey = `${slot.start}-${slot.end}`;
    const hasBreak = list.some(s => s.type === 'break' && `${s.start}-${s.end}` === slotKey && ((s.day||0)===0 || (s.day>=1 && s.day<=5)));
    if (hasBreak){
      grid.appendChild(hdrCell(`${slot.start}–${slot.end}`, "", {"data-slot": slotKey}));
      const band = document.createElement('div');
      band.className = 'break-band';
      band.textContent = (list.find(s => s.type==='break' && `${s.start}-${s.end}`===slotKey)?.label) || 'DESCANS';
      band.style.gridColumn = '2 / -1';
      grid.appendChild(band);
      continue;
    }
grid.appendChild(hdrCell(`${slot.start}–${slot.end}`, "", {"data-slot": slotKey}));
    for (let d=1; d<=5; d++) {
      const bucket = byDaySlot[d]?.[slotKey] || [];
      grid.appendChild(cellFor(bucket, {"data-day": String(d), "data-slot": slotKey}));
    }
  }

  scheduleDiv.innerHTML = "";
  scheduleDiv.appendChild(grid);
}

function hdrCell(text, extraCls = "", dataset = null) {
  const div = document.createElement("div");
  div.className = "hdr" + (extraCls ? (" " + extraCls) : "");
  if (dataset) for (const k in dataset) div.setAttribute(k, dataset[k]);
  div.textContent = text;
  return div;
}

function cellFor(items, dataset = null) {
  const div = document.createElement("div");
  div.className = "cell";
  if (dataset) for (const k in dataset) div.setAttribute(k, dataset[k]);

  if (!items.length) {
    div.innerHTML = `<span class="muted">—</span>`;
    return div;
  }

  // múltiples sessions a la mateixa cel·la (subgrups…)
  div.style.display = "flex";
  div.style.flexDirection = "column";
  div.style.gap = "6px";

  div.innerHTML = items.map(s => {
    const subj = escapeHtml(s.subject || "");
    const room = s.room ? ` · ${escapeHtml(s.room)}` : "";
    const extra = MODE === "class" ? professorName(s.teacherId) : groupName(s.groupId);
    const c = colorForSubjectItem(s);
    const style = `style="background:${c.bg}; border:1px solid ${c.border}; color:${c.text}; padding:8px 10px; border-radius: var(--cell-radius, 8px);"`;
    return `<div ${style}><strong>${subj}</strong> — <span class="muted" style="opacity:.85">${escapeHtml(extra)}${room}</span></div>`;
  }).join("");
  return div;
}

function professorName(id) { return professors.find(t=>t.id===id)?.name ?? id; }
function groupName(id)     { return classes.find(c=>c.id===id)?.name ?? id; }

function escapeHtml(x) {
  return x.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function needsLightText(hex){
  if (!hex || !hex.startsWith('#') || (hex.length !== 7)) return false;
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  const y = (r*299 + g*587 + b*114) / 1000;
  return y < 110;
}

// Auto-render a partir de paràmetres (?mode=class|teacher&id=...&embed=1)
function autoRenderFromParams(){
  const qs = new URLSearchParams(location.search);
  const mode = qs.get('mode');
  const id = qs.get('id');
  const embed = qs.get('embed');
  const trim = parseInt(qs.get('trim') || '1', 10);
  const brand = qs.get('brand');

  if (mode && (mode==='class' || mode==='teacher')) MODE = mode;
  if (embed==='1' || embed==='true'){ document.body.classList.add('embed'); document.body.classList.add('show-brand'); }
  if (brand==='1' || brand==='true'){ document.body.classList.add('show-brand'); }

  TRIM = isNaN(trim) ? 1 : trim;
  if (trimSelect) trimSelect.value = String(TRIM);

  if (id){
    const items = MODE === "class" ? classes : professors;
    const found = items.find(i => i.id === id);
    if (found){
      selectEl.value = id;
      const filtered = filterSessions(MODE, id);
      renderSchedule(filtered);
    }
  }
  updateBrandHeader();
}
function updateBrandHeader() {
  const id = selectEl.value;
  const items = MODE === "class" ? classes : professors;
  const entity = items.find(x=>x.id===id);
  updateBrandHeader();
}

selectEl.addEventListener("change", () => { updateBrandHeader(); });

if (trimSelect){
  trimSelect.addEventListener('change', () => {
    TRIM = Number(trimSelect.value || 1);
    const id = selectEl.value;
    const filtered = filterSessions(MODE, id);
    renderSchedule(filtered);
    updateBrandHeader();
  });
}


/** Actualitza la capçalera corporativa amb text per cicle (classe) o professor/a */
function updateBrandHeader() {
  const id = selectEl.value;
  const ord = (n) => (n==1? '1r' : (n==2? '2n' : (n==3? '3r' : `${n}è`)));
  if (MODE === 'class') {
    const m = (id || '').match(/^([A-Z]+)(\d)$/);
    const code = m ? m[1] : (id || '—');
    const year = m ? parseInt(m[2],10) : 1;
    const cycle = cycles[code] || {abbr: code, fullName: code};
    if (brandTitle) brandTitle.textContent = `${ord(year)} de ${cycle.fullName} (${cycle.abbr})`;
    if (brandSubtitle) brandSubtitle.textContent = `Curs 2025/2026 - ${ord(TRIM)} Trimestre`;
  } else {
    const entity = (MODE === 'teacher' ? professors : classes).find(x => x.id === id);
    if (brandTitle) brandTitle.textContent = entity?.name || 'Horari';
    if (brandSubtitle) brandSubtitle.textContent = `Curs 2025/2026 - ${ord(TRIM)} Trimestre`;
  }
}
