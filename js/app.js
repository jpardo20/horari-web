// Horari — render per classe o per professor/a
// Fitxers: data/classes.json, data/professors.json, data/sessions.json, data/colors.json

const DAYS = ["", "Dilluns","Dimarts","Dimecres","Dijous","Divendres"]; // 1..5

let MODE = "class"; // "class" | "teacher"
let classes = [];
let professors = [];
let sessions = [];
let subjectColors = {}; // subject -> hex

const modeButtons = document.getElementById("modeButtons");
const selectEl = document.getElementById("entitySelect");
const selectLabel = document.getElementById("selectLabel");
const renderBtn = document.getElementById("renderBtn");
const scheduleDiv = document.getElementById("schedule");

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
  subjectColors = await fetch("data/colors.json").then(r=>r.json()).catch(()=> ({}));

  refreshSelect();
  autoRenderFromParams();
})();

function refreshSelect() {
  const items = MODE === "class" ? classes : professors;
  selectLabel.textContent = MODE === "class" ? "Classe:" : "Professor:";
  selectEl.innerHTML = `<option value="">— Selecciona —</option>` +
    items.map(i => `<option value="${i.id}">${i.name}</option>`).join("");
  scheduleDiv.innerHTML = ""; // neteja
}

function filterSessions(mode, id) {
  return sessions.filter(s => mode === "class" ? s.groupId === id : s.teacherId === id);
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
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(140px, 1fr))`;

  // Capçalera (Afegim data-day per a highlight.js)
  grid.appendChild(hdrCell("Hora"));
  for (let d=1; d<=5; d++) grid.appendChild(hdrCell(DAYS[d], "", {"data-day": String(d)}));

  // Cos (Afegim data-slot i data-day per a highlight.js)
  for (const slot of slots) {
    const slotKey = `${slot.start}-${slot.end}`;
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
    const color = subjectColors[subj] || null;
    const style = color ? `style="background:${color}; padding:8px; border-radius:8px; ${needsLightText(color) ? 'color:white' : ''}"` : "";
    return `<div ${style}><strong>${subj}</strong> — <span class="muted" style="${color && needsLightText(color) ? 'color:#f0f0f0' : ''}">${escapeHtml(extra)}${room}</span></div>`;
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
  const mode = PARAMS.get('mode');
  const id = PARAMS.get('id');
  const embed = PARAMS.get('embed');
  if (mode && (mode==='class' || mode==='teacher')) MODE = mode;

  if (embed==='1' || embed==='true'){
    document.body.classList.add('embed');
  }

  if (id){
    const items = MODE === "class" ? classes : professors;
    const found = items.find(i => i.id === id);
    if (found){
      selectEl.value = id;
      const filtered = filterSessions(MODE, id);
      renderSchedule(filtered);
    }
  }
}