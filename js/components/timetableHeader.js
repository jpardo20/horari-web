// js/components/timetableHeader.js

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Capçalera superior (Hora + dies)
 */
export function renderHeaderTop(days, getDayLabel) {
  return `
    <div class="tt-hdr">Hora</div>
    ${days.map(d => `
      <div class="tt-hdr" data-day="${d}">
        ${escapeHtml(getDayLabel(d))}
      </div>
    `).join("")}
  `;
}

/**
 * Capçalera lateral (hores)
 */
export function renderTimeHeader(start, end, slotKey) {
  return `
    <div class="tt-hdr" data-slot="${escapeHtml(slotKey)}">
      ${escapeHtml(start)}–<br>${escapeHtml(end)}
    </div>
  `;
}

/**
 * Capçalera de descans
 */
export function renderBreakHeader(start, end) {
  return `
    <div class="tt-hdr">
      ${escapeHtml(start)}–<br>${escapeHtml(end)}
    </div>
  `;
}