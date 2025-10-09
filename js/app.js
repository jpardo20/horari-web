const DAYS = ["", "Dilluns","Dimarts","Dimecres","Dijous","Divendres"]; // 1..5

let MODE = "class"; // "class" | "teacher"
let classes = [];
let teachers = [];
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

(async function init() {
  [classes, teachers, sessions, subjectColors] = await Promise.all([
    fetch("data/classes.json").then(r=>r.json()),
    fetch("data/teachers.json").then(r=>r.json()),
    fetch("data/sessions.json").then(r=>r.json()),
    fetch("data/colors.json").then(r=>r.json())
  ]);
  refreshSelect();
})();

function refreshSelect() {
  const items = MODE === "class" ? classes : teachers;
  selectLabel.textContent = MODE === "class" ? "Classe:" : "Professor:";
  selectEl.innerHTML = `<option value="">— Selecciona —</option>` +
    items.map(i => `<option value="${i.id}">${i.name}</option>`).join("");
  scheduleDiv.innerHTML = ""; // neteja
}

function filterSessions(mode, id) {
  return sessions.filter(s => mode === "class" ? s.groupId === id : s.teacherId === id);
}

function renderSchedule(list) {
  if (!list.length) {
    scheduleDiv.innerHTML = `<p class="muted">No hi ha sessions per a la selecció.</p>`;
    return;
  }

  // 1) time slots uniques
  const key = s => `${s.start}-${s.end}`;
  const slots = Array.from(new Set(list.map(key)))
    .map(k => ({ start: k.split("-")[0], end: k.split("-")[1] }))
    .sort((a,b) => a.start.localeCompare(b.start));

  // 2) by day + slot
  const byDaySlot = {};
  for (const s of list) {
    const k = key(s);
    byDaySlot[s.day] ??= {};
    byDaySlot[s.day][k] ??= [];
    byDaySlot[s.day][k].push(s);
  }

  // 3) Render grid
  const cols = 1 + 5; // hours + days
  const grid = document.createElement("div");
  grid.className = "grid";
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(140px, 1fr))`;

  // header row
  grid.appendChild(hdrCell("Hora"));
  for (let d=1; d<=5; d++) grid.appendChild(hdrCell(DAYS[d]));

  // body
  for (const slot of slots) {
    grid.appendChild(hdrCell(`${slot.start}–${slot.end}`));
    for (let d=1; d<=5; d++) {
      const k = `${slot.start}-${slot.end}`;
      const bucket = byDaySlot[d]?.[k] || [];
      grid.appendChild(cellFor(bucket));
    }
  }

  scheduleDiv.innerHTML = "";
  scheduleDiv.appendChild(grid);
}

function hdrCell(text) {
  const div = document.createElement("div");
  div.className = "hdr";
  div.textContent = text;
  return div;
}

function cellFor(items) {
  const div = document.createElement("div");
  div.className = "cell";
  if (!items.length) {
    div.innerHTML = `<span class="muted">—</span>`;
    return div;
  }

  // multiple sessions in same cell (subgroups...)
  div.style.display = "flex";
  div.style.flexDirection = "column";
  div.style.gap = "6px";

  div.innerHTML = items.map(s => {
    const subj = escapeHtml(s.subject);
    const room = s.room ? ` · ${escapeHtml(s.room)}` : "";
    const extra = MODE === "class" ? teacherName(s.teacherId) : groupName(s.groupId);
    const color = subjectColors[subj] || null;
    // Wrap each item in a colored block
    const style = color ? `style="background:${color}; padding:8px; border-radius:8px; ${needsLightText(color) ? 'color:white' : ''}"` : "";
    return `<div ${style}><strong>${subj}</strong> — <span class="muted" style="${color && needsLightText(color) ? 'color:#f0f0f0' : ''}">${escapeHtml(extra)}${room}</span></div>`;
  }).join("");
  return div;
}

function teacherName(id) { return teachers.find(t=>t.id===id)?.name ?? id; }
function groupName(id)   { return classes.find(c=>c.id===id)?.name ?? id; }

function escapeHtml(x) {
  return x.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function needsLightText(hex){
  // expects '#RRGGBB'
  if (!hex || !hex.startsWith('#') || (hex.length !== 7)) return false;
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  // luminance approximation
  const y = (r*299 + g*587 + b*114) / 1000;
  return y < 110;
}
