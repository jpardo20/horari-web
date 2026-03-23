// js/components/timetableCell.js

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Renderitza una cel·la del timetable
 */
export function renderTimetableCell({
  day,
  start,
  end,
  slotKey,
  sessions,
  renderSessionContent,
  sessionIdFn
}) {
  const cellContent =
    sessions.length
      ? sessions.map(s => {
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

  return `
    <div class="tt-cell"
         data-day="${day}"
         data-start="${escapeHtml(start)}"
         data-end="${escapeHtml(end)}"
         data-slot="${escapeHtml(slotKey)}">
      ${cellContent}
    </div>
  `;
}