/**
 * Admin Sessions (scaffold)
 * - Uses shared core loader
 * - Shows a small summary
 * - Next steps: filters, table editor, validation, export
 */

import { loadData } from "../core/data.js";

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
  try {
    const data = await loadData("data");
    renderSummary(data);
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
