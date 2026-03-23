// js/components/sessionCard.js

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i);
  }
  return h >>> 0;
}

const PALETTE = [
  { bg: '#E8F1FF', border: '#C9DFFF' },
  { bg: '#EAFBF1', border: '#C8F2DD' },
  { bg: '#FFF2E5', border: '#FFD7B8' },
  { bg: '#F8EAFE', border: '#EBCDFD' },
  { bg: '#FDECF0', border: '#F8CDD6' },
  { bg: '#EAF7FE', border: '#CDEBFD' },
  { bg: '#EFFFF4', border: '#D4FBE3' },
  { bg: '#FFFDEB', border: '#FFF4B8' },
  { bg: '#E9F5FF', border: '#CFE9FF' },
  { bg: '#F2E9FF', border: '#E0CFFF' },
  { bg: '#FFE9F7', border: '#FFCFEA' },
  { bg: '#E9FFF7', border: '#CFF7EA' }
];

function colorForSubject(subjectId) {
  const i = hashStr(subjectId || "") % PALETTE.length;
  return { ...PALETTE[i], text: "#1f2937" };
}

/**
 * Renderitza una sessió
 * @param {Object} s
 * @param {Object} ctx
 * @param {Function} ctx.resolveTeacherName
 * @param {Function} ctx.resolveSubjectName
 */
export function renderSessionCard(s, ctx) {
  const teacher = escapeHtml(ctx.resolveTeacherName(s.teacherId) || "");
  const room = s.room ? ` · ${escapeHtml(s.room)}` : "";
  const extra = teacher ? `${teacher}${room}` : `${room}`.replace(/^ · /, "");

  const subjectCode = s.subjectId ?? "";
  const subjectName = ctx.resolveSubjectName(subjectCode);

  const { bg, border, text } = colorForSubject(subjectCode);

  return `
    <div class="tt-session"
         style="--bg:${bg}; --border:${border}; --text:${text};">
      <div class="tt-session-title">
        ${escapeHtml(subjectCode)} - ${escapeHtml(subjectName)}
      </div>
      <div class="tt-session-sub">
        ${extra || "—"}
      </div>
    </div>
  `;
}