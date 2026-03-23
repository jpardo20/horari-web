// js/core/renderTimetable.js

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
    <div class="tt-break-band">${escapeHtml(label)}</div>
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
      `<p class="tt-empty">No hi ha sessions per a aquesta selecció.</p>`;
    return;
  }

  if (typeof renderSessionContent !== "function") {
    throw new Error("renderTimetable: cal proporcionar opts.renderSessionContent(session)");
  }

  const slots = getTimeSlots(sessions);
  const rows = buildRowsWithBreaks(slots, sessions, breaks);

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
    <div class="tt-grid">
      <div class="tt-hdr">Hora</div>
      ${days.map(d => `
        <div class="tt-hdr" data-day="${d}">
          ${escapeHtml(getDayLabel(d))}
        </div>
      `).join("")}
  `;

  for (const row of rows) {
    if (row.kind === "break") {
      html += `
        <div class="tt-hdr">
          ${escapeHtml(row.br.start)}–<br>${escapeHtml(row.br.end)}
        </div>
        <div class="tt-break-wrapper">
          ${breakRowHtml(row.br.label || "DESCANS")}
        </div>
      `;
      continue;
    }

    const slot = row.slot;
    const slotKey = `${slot.start}-${slot.end}`;

    html += `
      <div class="tt-hdr" data-slot="${escapeHtml(slotKey)}">
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
            }).join(`<div class="tt-gap"></div>`)
          : `<div class="tt-empty-cell">—</div>`;

      html += `
        <div class="tt-cell"
             data-day="${d}"
             data-start="${escapeHtml(slot.start)}"
             data-end="${escapeHtml(slot.end)}"
             data-slot="${escapeHtml(slotKey)}">
          ${cellContent}
        </div>
      `;
    }
  }

  html += `</div>`;
  container.innerHTML = html;
}