/**
 * Admin Sessions (scaffold)
 * - Loads JSON data from /data
 * - Shows a small summary
 * - Next steps: filters, table editor, validation, export
 */

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${path}`);
  return res.json();
}

function $(id) {
  return document.getElementById(id);
}

function setStatus(msg) {
  $("status").textContent = msg;
}

function renderSummary({ sessions, professors, assignatures, rols, descansos }) {
  const s = Array.isArray(sessions) ? sessions.length : 0;
  const p = Array.isArray(professors) ? professors.length : 0;
  const a = Array.isArray(assignatures) ? assignatures.length : 0;
  const r = Array.isArray(rols) ? rols.length : 0;
  const d = Array.isArray(descansos) ? descansos.length : 0;

  $("summary").classList.remove("muted");
  $("summary").innerHTML = `
    <ul>
      <li><strong>Sessions</strong>: ${s}</li>
      <li><strong>Professors</strong>: ${p}</li>
      <li><strong>Assignatures</strong>: ${a}</li>
      <li><strong>Rols</strong>: ${r}</li>
      <li><strong>Descansos</strong>: ${d}</li>
    </ul>
  `;
}

async function loadFromServer() {
  setStatus("Carregant dades del servidor...");

  const paths = {
    sessions: "data/sessions.json",
    professors: "data/professors.json",
    assignatures: "data/assignatures.json",
    rols: "data/rols.json",
    descansos: "data/descansos.json",
  };

  try {
    const [sessions, professors, assignatures, rols, descansos] = await Promise.all([
      fetchJson(paths.sessions),
      fetchJson(paths.professors),
      fetchJson(paths.assignatures),
      fetchJson(paths.rols),
      fetchJson(paths.descansos),
    ]);

    renderSummary({ sessions, professors, assignatures, rols, descansos });
    setStatus("✅ Dades carregades correctament.");
  } catch (err) {
    console.error(err);
    setStatus(`❌ Error carregant dades: ${err.message}`);
  }
}

function init() {
  $("btnLoadServer").addEventListener("click", loadFromServer);
}

document.addEventListener("DOMContentLoaded", init);
