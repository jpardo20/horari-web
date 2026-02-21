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
  const gridEl = $("grid");

  if (!DATA) {
    gridEl.textContent = "Encara no s’han carregat dades.";
    gridEl.classList.add("muted");
    return;
  }

  gridEl.classList.remove("muted");
  gridEl.innerHTML = "";

  // 1️⃣ dies fixos (1–5)
  const DAYS = [1, 2, 3, 4, 5];

  // 2️⃣ franges úniques ordenades
  const slots = Array.from(
    new Set(sessions.map((s) => `${s.start}|${s.end}`))
  )
    .map((str) => {
      const [start, end] = str.split("|");
      return { start, end };
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  // 3️⃣ taula
  const table = document.createElement("table");
  table.className = "admin-grid-table";

  // THEAD
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const thTime = document.createElement("th");
  thTime.textContent = "Hora";
  headRow.appendChild(thTime);

  for (const day of DAYS) {
    const th = document.createElement("th");
    th.textContent = formatDay(day);
    headRow.appendChild(th);
  }

  thead.appendChild(headRow);
  table.appendChild(thead);

  // TBODY
  const tbody = document.createElement("tbody");

  for (const slot of slots) {
    const tr = document.createElement("tr");

    // Columna hora
    const tdTime = document.createElement("td");
    tdTime.textContent = `${slot.start} - ${slot.end}`;
    tr.appendChild(tdTime);

    // Columnes dies
    for (const day of DAYS) {
      const td = document.createElement("td");
      td.dataset.day = day;
      td.dataset.start = slot.start;
      td.dataset.end = slot.end;
      td.className = "grid-cell";

      // buscar sessió que encaixi exactament
      const session = sessions.find(
        (s) =>
          s.day === day &&
          s.start === slot.start &&
          s.end === slot.end
      );

      if (session) {
        const div = document.createElement("div");
        div.className = "session-block";
        div.dataset.id = session._id;

        const subj = MAPS.subjectsById.get(session.subjectId)?.name ?? "";
        const teacher = MAPS.teachersById.get(session.teacherId)?.name ?? "";

        div.innerHTML = `
          <strong>${subj}</strong><br>
          <small>${teacher}</small><br>
          <small>${session.room ?? ""}</small>
        `;

        td.appendChild(div);
      }

      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  gridEl.appendChild(table);
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