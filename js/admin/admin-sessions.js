import { loadData } from "../core/data.js";
import { filterSessions, uniqueSorted } from "../core/filters.js";
import { buildMapByKey } from "../core/lookup.js";
import { formatDay } from "../core/format.js";

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
    teacherMap: buildMapByKey(data.professors, "id"),
    subjectMap: buildMapByKey(data.assignatures, "subjectId"),
  };
}

function populateFilters(sessions) {
  const trimesters = uniqueSorted(sessions.map(s => s.trimester));
  const groups = uniqueSorted(sessions.map(s => s.groupId));
  const teachers = uniqueSorted(sessions.map(s => s.teacherId));

  const tSel = $("filterTrimester");
  const gSel = $("filterGroup");
  const pSel = $("filterTeacher");

  trimesters.forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = `Trim ${v}`;
    tSel.appendChild(o);
  });

  groups.forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    gSel.appendChild(o);
  });

  teachers.forEach(v => {
    const prof = MAPS.teacherMap[v];
    const o = document.createElement("option");
    o.value = v;
    o.textContent = prof ? prof.name : v;
    pSel.appendChild(o);
  });
}

function renderTable(sessions) {
  if (!sessions.length) {
    $("sessionsTable").innerHTML = "<em>No hi ha sessions.</em>";
    return;
  }

  const rows = sessions.map(s => {
    const teacher = MAPS.teacherMap[s.teacherId];
    const subject = MAPS.subjectMap[s.subjectId];

    return `
      <tr>
        <td>${s.trimester}</td>
        <td>${formatDay(s.day)}</td>
        <td>${s.start}</td>
        <td>${s.end}</td>
        <td>${s.groupId}</td>
        <td>${teacher ? teacher.name : s.teacherId}</td>
        <td>${subject ? subject.name : s.subjectId}</td>
        <td>${s.room}</td>
      </tr>
    `;
  }).join("");

  $("sessionsTable").innerHTML = `
    <table border="1" cellpadding="4" cellspacing="0">
      <thead>
        <tr>
          <th>Trim</th>
          <th>Dia</th>
          <th>Inici</th>
          <th>Fi</th>
          <th>Grup</th>
          <th>Professor</th>
          <th>Assignatura</th>
          <th>Aula</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function applyFilters() {
  const filtered = filterSessions(DATA.sessions, {
    trimester: $("filterTrimester").value || null,
    groupId: $("filterGroup").value || null,
    teacherId: $("filterTeacher").value || null,
  });

  renderTable(filtered);
}

function exportJson() {
  const blob = new Blob(
    [JSON.stringify(DATA.sessions, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sessions.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function loadFromServer() {
  setStatus("Carregant dades...");
  try {
    DATA = await loadData("data");
    MAPS = buildMaps(DATA);
    populateFilters(DATA.sessions);
    renderTable(DATA.sessions);
    setStatus("✅ Dades carregades correctament.");
  } catch (err) {
    console.error(err);
    setStatus(`❌ Error: ${err.message}`);
  }
}

function init() {
  $("btnLoadServer").addEventListener("click", loadFromServer);
  $("btnApplyFilters").addEventListener("click", applyFilters);
  $("btnExport").addEventListener("click", exportJson);
}

document.addEventListener("DOMContentLoaded", init);
