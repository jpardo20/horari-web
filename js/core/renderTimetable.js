// js/core/renderTimetable.js
// Motor compartit de render d'horaris.
// No sap com es pinta una sessió.
// Només construeix layout i delega el contingut.

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseTime(t) {
  const [h, m] = String(t).split(":").map(Number);
  return (h * 60) + (m || 0);
}

function getTimeSlots(filteredSessions) {
  const slots = new Map();
  for (const s of filteredSessions) {
    if (!s.start || !s.end) continue;
    const key = `${s.start}-${s.end}`;
    if (!slots.has(key)) {
      slots.set(key, { start: s.start, end: s.end });
    }
  }
  return Array.from(slots.values())
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));
}

function breakRowHtml(label = "DESCANS") {
  return `
    <div style="
      width:100%;
      text-align:center;
      font-weight:800;
      letter-spacing:.5px;
      padding:10px 0;
      border-radius:10px;
      background:#666;
      color:#fff;
      border:2px dashed rgba(0,0,0,.25);
    ">${escapeHtml(label)}</div>
  `;
}

function shouldShowBreak(breakItem, sessions) {
  const bStart = parseTime(breakItem.start);
  const bEnd = parseTime(breakItem.end);

  let hasBefore = false;
  let hasAfter = false;

  for (const s of sessions) {
    const sStart = parseTime(s.start);
    const sEnd = parseTime(s.end);

    if (sEnd <= bStart) hasBefore = true;
    if (sStart >= bEnd) hasAfter = true;

    if (hasBefore && hasAfter) return true;
  }
  return false;
}

function buildRowsWithBreaks(timeSlots, sessions, breaks) {
  const normBreaks = (Array.isArray(breaks) ? breaks : [])
    .filter(b => b && b.start && b.end)
    .slice()
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));

  const rows = [];
  let i = 0;

  for (const b of normBreaks) {
    const bStart = parseTime(b.start);

    while (i < timeSlots.length && parseTime(timeSlots[i].start) < bStart) {
      rows.push({ kind: "slot", slot: timeSlots[i] });
      i++;
    }

    if (shouldShowBreak(b, sessions)) {
      rows.push({ kind: "break", br: b });
    }
  }

  while (i < timeSlots.length) {
    rows.push({ kind: "slot", slot: timeSlots[i] });
    i++;
  }

  return rows;
}

/**
 * Renderitza horari.
 *
 * @param {HTMLElement} container
 * @param {Array} sessions - sessions ja filtrades
 * @param {Object} opts
 * @param {Array<number>} [opts.days]
 * @param {Object|Map} [opts.dayLabels]
 * @param {Array} [opts.breaks]
 * @param {Function} opts.renderSessionContent - (session) => html
 * @param {Function} [opts.sessionIdFn] - (session) => id string
 */
export function renderTimetable(container, sessions, opts = {}) {
  const {
    days = [1, 2, 3, 4, 5],
    dayLabels = new Map([
      [1,"Dilluns"],
      [2,"Dimarts"],
      [3,"Dimecres"],
      [4,"Dijous"],
      [5,"Divendres"]
    ]),
    breaks = [],
    renderSessionContent,
    sessionIdFn = null
  } = opts;

  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(sessions) || sessions.length === 0) {
    container.innerHTML =
      `<p style="padding:12px; color:#444;">No hi ha sessions per a aquesta selecció.</p>`;
    return;
  }

  if (typeof renderSessionContent !== "function") {
    throw new Error("renderTimetable: cal proporcionar opts.renderSessionContent(session)");
  }

  const slots = getTimeSlots(sessions);
  const rows = buildRowsWithBreaks(slots, sessions, breaks);

  // Index ràpid day|start|end
  const map = new Map();
  for (const s of sessions) {
    const key = `${Number(s.day)}|${s.start}|${s.end}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }

  const getDayLabel = (d) =>
    dayLabels instanceof Map
      ? dayLabels.get(d) || ""
      : dayLabels?.[d] || "";

  let html = `
    <div class="timetable-grid"
         style="display:grid; grid-template-columns: 110px repeat(${days.length}, 1fr); gap:10px; align-items:stretch;">
      <div class="hdr"
           style="background:#0aa; color:#fff; font-weight:800; padding:10px; border-radius:10px; text-align:center;">
        Hora
      </div>
      ${days.map(d => `
        <div class="hdr"
             data-day="${d}"
             style="background:#0aa; color:#fff; font-weight:800; padding:10px; border-radius:10px; text-align:center;">
          ${escapeHtml(getDayLabel(d))}
        </div>
      `).join("")}
  `;

  for (const row of rows) {
    if (row.kind === "break") {
      html += `
        <div class="hdr"
             style="background:#0aa; color:#fff; font-weight:800; padding:10px; border-radius:10px; text-align:center;">
          ${escapeHtml(row.br.start)}–<br>${escapeHtml(row.br.end)}
        </div>
        <div style="grid-column: 2 / span ${days.length};">
          ${breakRowHtml(row.br.label || "DESCANS")}
        </div>
      `;
      continue;
    }

    const slot = row.slot;
    const slotKey = `${slot.start}-${slot.end}`;

    html += `
      <div class="hdr"
           data-slot="${escapeHtml(slotKey)}"
           style="background:#0aa; color:#fff; font-weight:800; padding:10px; border-radius:10px; text-align:center;">
        ${escapeHtml(slot.start)}–<br>${escapeHtml(slot.end)}
      </div>
    `;

    for (const d of days) {
      const key = `${d}|${slot.start}|${slot.end}`;
      const cellSessions = map.get(key) || [];

      const cellContent =
        cellSessions.length
          ? cellSessions.map(s => {
              const idAttr = sessionIdFn
                ? ` data-id="${escapeHtml(sessionIdFn(s))}"`
                : "";
              return `
                <div class="session-wrapper"${idAttr}>
                  ${renderSessionContent(s)}
                </div>
              `;
            }).join(`<div style="height:8px;"></div>`)
          : `<div style="padding:10px 12px; color:#999;">—</div>`;

      html += `
        <div class="cell"
             data-day="${d}"
             data-start="${escapeHtml(slot.start)}"
             data-end="${escapeHtml(slot.end)}"
             data-slot="${escapeHtml(slotKey)}"
             style="border:1px solid rgba(0,0,0,.12);
                    border-radius:10px;
                    padding:10px;
                    min-height:72px;
                    background:#fff;">
          ${cellContent}
        </div>
      `;
    }
  }

  html += `</div>`;
  container.innerHTML = html;
}