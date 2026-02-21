import { loadData } from "../core/data.js";
import { filterSessions, uniqueSorted } from "../core/filters.js";
import { buildMapByKey } from "../core/lookup.js";
import { formatDay } from "../core/format.js";

import { initSessions, getSessions } from "../state/sessionState.js";

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
    teachersById: buildMapByKey(data.teachers, "_id"),
    subjectsById: buildMapByKey(data.subjects, "_id"),
    groupsById: buildMapByKey(data.groups, "_id"),
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
    const g = MAPS.groupsById.get(gid);
    const opt = document.createElement("option");
    opt.value = gid;
    opt.textContent = g ? g.name : gid;
    gSel.appendChild(opt);
  }

  for (const tid of teachers) {
    const te = MAPS.teachersById.get(tid);
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

/**
 * Placeholder de render.
 * Al següent commit:
 * - pintarem la graella real (dies x franges)
 * - blocs de sessions amb data-id, draggable, etc.
 */
function renderGrid(sessions) {
  if (!DATA) {
    $("grid").textContent = "Encara no s’han carregat dades.";
    $("grid").classList.add("muted");
    return;
  }

  const lines = [
    `Sessions visibles: ${sessions.length}`,
    "",
    "Exemple (primeres 10):",
    ...sessions.slice(0, 10).map((s) => {
      const subj = MAPS.subjectsById.get(s.subjectId)?.name ?? s.subjectId;
      const te = MAPS.teachersById.get(s.teacherId)?.name ?? s.teacherId;
      return `- ${formatDay(s.day)} ${s.start}-${s.end} · ${subj} · ${te} · ${s.room ?? ""}`;
    }),
  ];

  $("grid").classList.remove("muted");
  $("grid").textContent = lines.join("\n");
}

function applyFiltersAndRender() {
  const sessions = getFilteredSessions();
  renderGrid(sessions);
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

async function loadFromServer() {
  setStatus("Carregant dades...");
  try {
    DATA = await loadData("data");
    MAPS = buildMaps(DATA);

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