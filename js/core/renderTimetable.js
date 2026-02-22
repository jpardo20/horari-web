// js/core/renderTimetable.js
// Motor compartit de render d'horaris (mateix layout que app.js), però parametritzable
// per poder-se reutilitzar tant a la vista pública com a l'admin.

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
  const slots = new Map(); // key "08:20-09:20" -> {start,end}
  for (const s of filteredSessions) {
    const start = s.start;
    const end = s.end;
    if (!start || !end) continue;
    const key = `${start}-${end}`;
    if (!slots.has(key)) slots.set(key, { start, end });
  }
  const arr = Array.from(slots.values());
  arr.sort((a, b) => parseTime(a.start) - parseTime(b.start));
  return arr;
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

function shouldShowBreak(breakItem, filteredSessions) {
  const bStart = parseTime(breakItem.start);
  const bEnd = parseTime(breakItem.end);

  let hasBefore = false;
  let hasAfter = false;

  for (const s of filteredSessions) {
    const sStart = parseTime(s.start);
    const sEnd = parseTime(s.end);

    if (sEnd <= bStart) hasBefore = true;
    if (sStart >= bEnd) hasAfter = true;

    if (hasBefore && hasAfter) return true;
  }
  return false;
}

function buildRowsWithBreaks(timeSlots, filteredSessions, breaks) {
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

    if (shouldShowBreak(b, filteredSessions)) {
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
 * Renderitza horari amb el mateix layout que app.js.
 *
 * @param {HTMLElement} container - element on escriure el grid
 * @param {Array} sessions - sessions ja filtrades
 * @param {Object} opts
 * @param {Array<number>} [opts.days=[1,2,3,4,5]]
 * @param {Object|Map} [opts.dayLabels] - map/object day->label (Dilluns...)
 * @param {Array} [opts.breaks=[]] - descansos [{start,end,label}]
 * @param {Function} opts.sessionCardHtml - (s) => html de la targeta (mateix estil que app.js)
 * @param {Function} [opts.sessionIdFn] - (s) => string id (per admin DnD). Si no, no posa data-id.
 */
export function renderTimetable(container, sessions, opts) {
  const {
    days = [1, 2, 3, 4, 5],
    dayLabels = new Map([[1,"Dilluns"],[2,"Dimarts"],[3,"Dimecres"],[4,"Dijous"],[5,"Divendres"]]),
    breaks = [],
    sessionCardHtml,
    sessionIdFn = null
  } = (opts || {});

  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(sessions) || sessions.length === 0) {
    container.innerHTML = `<p style="padding:12px; color:#444;">No hi ha sessions per a aquesta selecció.</p>`;
    return;
  }

  if (typeof sessionCardHtml !== "function") {
    throw new Error("renderTimetable: cal proporcionar opts.sessionCardHtml(s) => html");
  }

  const slots = getTimeSlots(sessions);
  const rows = buildRowsWithBreaks(slots, sessions, breaks);

  // Index per accés ràpid: key day|start|end -> sessions[]
  const map = new Map();
  for (const s of sessions) {
    const day = Number(s.day);
    const key = `${day}|${s.start}|${s.end}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }

  const getDayLabel = (d) => {
    if (dayLabels instanceof Map) return dayLabels.get(d) || "";
    return dayLabels?.[d] || "";
  };

  // Capçalera
  let html = `
    <div class="timetable-grid" style="display:grid; grid-template-columns: 110px repeat(5, 1fr); gap:10px; align-items:stretch;">
      <div class="hdr" style="background:#0aa; color:#fff; font-weight:800; padding:10px; border-radius:10px; text-align:center;">Hora</div>
      ${days.map(d => `
        <div class="hdr" data-day="${d}" style="background:#0aa; color:#fff; font-weight:800; padding:10px; border-radius:10px; text-align:center;">
          ${escapeHtml(getDayLabel(d))}
        </div>
      `).join("")}
  `;

  for (const row of rows) {
    if (row.kind === "break") {
      const label = row.br.label || "DESCANS";
      html += `
        <div class="hdr" data-slot="${escapeHtml(row.br.start)}-${escapeHtml(row.br.end)}" style="background:#0aa; color:#fff; font-weight:800; padding:10px; border-radius:10px; text-align:center;">
          ${escapeHtml(row.br.start)}–<br>${escapeHtml(row.br.end)}
        </div>
        <div style="grid-column: 2 / span 5;">
          ${breakRowHtml(label)}
        </div>
      `;
      continue;
    }

    const slot = row.slot;
    const tLabel = `${escapeHtml(slot.start)}–<br>${escapeHtml(slot.end)}`;
    const slotKey = `${slot.start}-${slot.end}`;

    html += `
      <div class="hdr" data-slot="${escapeHtml(slotKey)}" style="background:#0aa; color:#fff; font-weight:800; padding:10px; border-radius:10px; text-align:center;">
        ${tLabel}
      </div>
    `;

    for (const d of days) {
      const key = `${d}|${slot.start}|${slot.end}`;
      const cellSessions = map.get(key) || [];

      const cell =
        cellSessions.length
          ? cellSessions.map(s => {
              const idAttr = sessionIdFn ? ` data-id="${escapeHtml(sessionIdFn(s))}"` : "";
              // wrapper per poder enganxar DnD sense tocar la targeta original
              return `<div class="session-wrapper"${idAttr}>${sessionCardHtml(s)}</div>`;
            }).join(`<div style="height:8px;"></div>`)
          : `<div style="padding:10px 12px; color:#999;">—</div>`;

      html += `
        <div
          class="cell"
          data-day="${d}"
          data-start="${escapeHtml(slot.start)}"
          data-end="${escapeHtml(slot.end)}"
          data-slot="${escapeHtml(slotKey)}"
          style="border:1px solid rgba(0,0,0,.12); border-radius:10px; padding:10px; min-height:72px; background:#fff;"
        >
          ${cell}
        </div>
      `;
    }
  }

  html += `</div>`;
  container.innerHTML = html;
}