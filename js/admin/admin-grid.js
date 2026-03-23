import { loadData } from "../core/data.js";
import { filterSessions, uniqueSorted } from "../core/filters.js";
import { buildMapByKey } from "../core/lookup.js";
import { renderTimetable } from "../core/renderTimetable.js";
import { renderSessionCard } from "../components/sessionCard.js";

import {
  initSessions,
  getSessions,
  moveSession
} from "../state/sessionState.js";

let DATA = null;
let MAPS = null;

function $(id) {
  return document.getElementById(id);
}

function setStatus(msg) {
  $("status").textContent = msg;
}

function buildMaps(data) {
  return {
    teachersById: buildMapByKey(data.professors ?? [], "id"),
    subjectsById: buildMapByKey(data.assignatures ?? [], "subjectId"),
    groupsById: buildMapByKey(data.classes ?? [], "id"),
  };
}

function enableControls() {
  $("btnExport").disabled = false;
  $("filterTrimester").disabled = false;
  $("filterGroup").disabled = false;
  $("filterTeacher").disabled = false;
  $("btnApplyFilters").disabled = false;
}

function populateFilters(sessions) {
  const trSel = $("filterTrimester");
  const gSel = $("filterGroup");
  const tSel = $("filterTeacher");

  trSel.innerHTML = `<option value="">Tots els trimestres</option>`;
  gSel.innerHTML = `<option value="">Tots els grups</option>`;
  tSel.innerHTML = `<option value="">Tots els professors</option>`;

  const trimesters = uniqueSorted(sessions.map((s) => s.trimester));
  const groups = uniqueSorted(sessions.map((s) => s.groupId));
  const teachers = uniqueSorted(sessions.map((s) => s.teacherId));

  for (const t of trimesters) {
    const opt = document.createElement("option");
    opt.value = String(t);
    opt.textContent = `Trimestre ${t}`;
    trSel.appendChild(opt);
  }

  for (const gid of groups) {
    const g = MAPS.groupsById[gid];
    const opt = document.createElement("option");
    opt.value = gid;
    opt.textContent = g ? g.name : gid;
    gSel.appendChild(opt);
  }

  for (const tid of teachers) {
    const te = MAPS.teachersById[tid];
    const opt = document.createElement("option");
    opt.value = tid;
    opt.textContent = te ? te.name : tid;
    tSel.appendChild(opt);
  }
}

function getFilteredSessions() {
  return filterSessions(getSessions(), {
    trimester: $("filterTrimester").value || null,
    groupId: $("filterGroup").value || null,
    teacherId: $("filterTeacher").value || null,
  });
}

function renderGrid(sessions) {
  const gridEl = $("grid");

  if (!sessions.length) {
    gridEl.classList.add("muted");
    gridEl.innerHTML = "No hi ha sessions per a aquest filtre.";
    return;
  }

  gridEl.classList.remove("muted");

  renderTimetable(gridEl, sessions, {
    days: [1, 2, 3, 4, 5],
    dayLabels: new Map([
      [1, "Dilluns"],
      [2, "Dimarts"],
      [3, "Dimecres"],
      [4, "Dijous"],
      [5, "Divendres"]
    ]),
    breaks: DATA.descansos || [],

    // 🔹 Aquí és l'únic canvi important
    renderSessionContent: (s) => renderSessionCard(s, {
    resolveTeacherName: (id) =>
        MAPS.teachersById[id]?.name ?? id,
    resolveSubjectName: (id) =>
        MAPS.subjectsById[id]?.name ?? id
    }),

    sessionIdFn: (s) => s._id
  });

  wireDnD();
}

function wireDnD() {
  document.querySelectorAll("#grid .session-wrapper[data-id]").forEach((el) => {
    el.draggable = true;
    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", el.dataset.id);
    });
  });

  document.querySelectorAll("#grid .cell").forEach((cell) => {
    cell.addEventListener("dragover", (e) => e.preventDefault());

    cell.addEventListener("drop", (e) => {
      e.preventDefault();

      const id = e.dataTransfer.getData("text/plain");
      const newDay = Number(cell.dataset.day);
      const newStart = cell.dataset.start;
      const newEnd = cell.dataset.end;

      try {
        moveSession(id, newDay, newStart, newEnd);
        applyFiltersAndRender();
        setStatus("✅ Sessió moguda correctament.");
      } catch (err) {
        setStatus("❌ Error: " + err.message);
      }
    });
  });
}

function applyFiltersAndRender() {
  renderGrid(getFilteredSessions());
}

function exportJson() {
  const blob = new Blob([JSON.stringify(getSessions(), null, 2)], {
    type: "application/json",
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sessions.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

async function loadBreaks() {
  try {
    const res = await fetch("data/descansos.json", { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function loadFromServer() {
  setStatus("Carregant dades...");
  try {
    DATA = await loadData("data");
    MAPS = buildMaps(DATA);

    DATA.descansos = await loadBreaks();

    initSessions(DATA.sessions);
    populateFilters(DATA.sessions);
    enableControls();

    applyFiltersAndRender();
    setStatus("✅ Dades carregades correctament.");
  } catch (err) {
    console.error(err);
    setStatus("❌ Error carregant dades. Mira la consola.");
  }
}

function init() {
  $("btnLoadServer").addEventListener("click", loadFromServer);
  $("btnApplyFilters").addEventListener("click", applyFiltersAndRender);
  $("btnExport").addEventListener("click", exportJson);
}

document.addEventListener("DOMContentLoaded", init);