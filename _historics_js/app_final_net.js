/* ============================================================
 * HORARIS WEB - app.js (net i definitiu)
 * ============================================================ */
(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const firstExisting = (...ids) => {
    for (const id of ids) {
      const el = byId(id);
      if (el) return el;
    }
    return null;
  };

  const escapeHtml = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const parseTime = (t) => {
    const [h, m] = String(t).split(":").map(Number);
    return h * 60 + m;
  };

  // ---------- Colors ----------
  function hashStr(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return h >>> 0;
  }
  const PALETTE = [
    { bg: "#E8F1FF", border: "#C9DFFF" }, { bg: "#EAFBF1", border: "#C8F2DD" },
    { bg: "#FFF2E5", border: "#FFD7B8" }, { bg: "#F8EAFE", border: "#EBCDFD" },
    { bg: "#FDECF0", border: "#F8CDD6" }, { bg: "#EAF7FE", border: "#CDEBFD" },
    { bg: "#EFFFF4", border: "#D4FBE3" }, { bg: "#FFFDEB", border: "#FFF4B8" },
    { bg: "#E9F5FF", border: "#CFE9FF" }, { bg: "#F2E9FF", border: "#E0CFFF" },
    { bg: "#FFE9F7", border: "#FFCFEA" }, { bg: "#E9FFF7", border: "#CFF7EA" }
  ];
  function colorForSubjectId(subjectId) {
    const code = subjectId || "";
    const i = hashStr(code) % PALETTE.length;
    const { bg, border } = PALETTE[i];
    return { bg, border, text: "#1f2937" };
  }

  // ---------- Data ----------
  let sessions = [];
  let descansos = [];
  const subjectNameById = new Map();
  const teacherNameById = new Map();

  // ---------- UI ----------
  const btnByClass = firstExisting("btnByClass", "btnClass", "btnClasse");
  const btnByTeacher = firstExisting("btnByTeacher", "btnTeacher", "btnProfessor");
  const entitySelect = firstExisting("entitySelect", "entity");
  const trimSelect = firstExisting("trimSelect", "trim");
  const renderBtn = firstExisting("renderBtn", "show");
  const scheduleOut = firstExisting("schedule");

  if (!entitySelect || !trimSelect || !renderBtn || !scheduleOut) {
    console.error("DOM bàsic no trobat (entitySelect/trimSelect/renderBtn/schedule).");
    return;
  }

  let MODE = "class";
  const DAY_LABELS = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres"];

  async function fetchJson(path) {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(path);
    return r.json();
  }
  async function fetchJsonWithFallback(paths) {
    for (const p of paths) {
      try { return await fetchJson(p); } catch (_) {}
    }
    return [];
  }

  async function loadData() {
    sessions = await fetchJsonWithFallback(["data/sessions.json", "../data/sessions.json", "sessions.json"]);
    descansos = await fetchJsonWithFallback(["data/descansos.json", "../data/descansos.json", "descansos.json"]);

    const assignaturesArr = await fetchJsonWithFallback(["data/assignatures.json", "../data/assignatures.json", "assignatures.json"]);
    subjectNameById.clear();
    for (const a of assignaturesArr) if (a?.subjectId) subjectNameById.set(a.subjectId, a.name ?? a.subjectId);

    const profArr = await fetchJsonWithFallback(["data/professors.json", "../data/professors.json", "professors.json"]);
    const rolsArr = await fetchJsonWithFallback(["data/rols.json", "../data/rols.json", "rols.json"]);
    teacherNameById.clear();
    for (const p of profArr) if (p?.id) teacherNameById.set(p.id, p.name ?? p.id);
    for (const r of rolsArr) if (r?.id) teacherNameById.set(r.id, r.name ?? r.id);

    descansos = (Array.isArray(descansos) ? descansos : [])
      .filter(b => b?.start && b?.end)
      .map(b => ({ start: String(b.start), end: String(b.end), label: String(b.label ?? "DESCANS") }))
      .sort((a, b) => parseTime(a.start) - parseTime(b.start));
  }

  function resolveTeacherName(id) { return teacherNameById.get(id) || id || ""; }
  function resolveSubjectName(id) { return subjectNameById.get(id) || id || ""; }

  function unique(arr) { return [...new Set(arr)]; }

  function setMode(mode) { MODE = mode; rebuildEntitySelect(); }

  function rebuildEntitySelect() {
    const prev = entitySelect.value;
    const items = MODE === "class"
      ? unique(sessions.map(s => s.groupId).filter(Boolean)).sort()
      : unique(sessions.map(s => resolveTeacherName(s.teacherId)).filter(Boolean)).sort();

    entitySelect.innerHTML = `<option value="">— Selecciona —</option>`;
    for (const v of items) {
      const o = document.createElement("option");
      o.value = v; o.textContent = v;
      entitySelect.appendChild(o);
    }
    if (prev && items.includes(prev)) entitySelect.value = prev;
  }

  function getSelectedTrimester() {
    const raw = String(trimSelect.value ?? "").trim();
    if (!raw) return "";
    const m = raw.match(/(\d+)/);
    return m ? m[1] : raw;
  }

  function filterSessionsForView(entity, trimester) {
    return sessions.filter(s => {
      if (!s) return false;
      if (trimester) {
        const m = String(s.trimester ?? "").match(/(\d+)/);
        const st = m ? m[1] : String(s.trimester ?? "");
        if (st !== String(trimester)) return false;
      }
      if (MODE === "class") return String(s.groupId ?? "") === String(entity);
      return resolveTeacherName(s.teacherId) === String(entity);
    });
  }

  // Break applies (per day)
  function breakAppliesForDay(daySessions, br) {
    const bs = parseTime(br.start), be = parseTime(br.end);
    let before = false, after = false;
    for (const s of daySessions) {
      const ss = parseTime(s.start), se = parseTime(s.end);
      if (se <= bs) before = true;
      if (ss >= be) after = true;
      if (before && after) return true;
    }
    return false;
  }
  function breakAppliesAnyDay(data, br) {
    for (let d = 0; d < 5; d++) {
      const ds = data.filter(s => Number(s.day) === d);
      if (breakAppliesForDay(ds, br)) return true;
    }
    return false;
  }

  function buildSlots(data) {
    const m = new Map();
    for (const s of data) {
      if (!s.start || !s.end) continue;
      const k = `${s.start}-${s.end}`;
      if (!m.has(k)) m.set(k, { start: String(s.start), end: String(s.end) });
    }
    return [...m.values()].sort((a, b) => parseTime(a.start) - parseTime(b.start));
  }

  function breakRowHtml(label) {
    return `
      <div style="
        grid-column: 1 / span 6;
        text-align:center;
        font-weight:800;
        letter-spacing:.4px;
        padding:10px 0;
        border-radius:10px;
        background:#666;
        color:#fff;
        border:2px dashed rgba(0,0,0,.25);
      ">${escapeHtml(label)}</div>
    `;
  }

  function sessionCardHtml(s) {
    const subjectCode = s.subjectId ?? "";
    const subjectName = resolveSubjectName(subjectCode);
    const teacher = resolveTeacherName(s.teacherId);
    const room = s.room ? ` · ${escapeHtml(s.room)}` : "";
    const { bg, border, text } = colorForSubjectId(subjectCode);

    return `
      <div style="
        background:${bg};
        border:1px solid ${border};
        border-radius:10px;
        padding:10px 12px;
        color:${text};
        line-height:1.2;
      ">
        <div style="font-weight:700; margin-bottom:4px;">
          ${escapeHtml(subjectCode)} - ${escapeHtml(subjectName)}
        </div>
        <div style="opacity:.85; font-size:.95em;">
          ${escapeHtml(teacher)}${room}
        </div>
      </div>
    `;
  }

  function renderSchedule() {
    const entity = String(entitySelect.value ?? "");
    const trimester = getSelectedTrimester();

    if (!entity) { scheduleOut.innerHTML = "<p>Selecciona una classe o un professor.</p>"; return; }

    const data = filterSessionsForView(entity, trimester);
    if (!data.length) { scheduleOut.innerHTML = "<p>No hi ha dades per a la selecció actual.</p>"; return; }

    const slots = buildSlots(data);
    const activeBreaks = descansos.filter(br => breakAppliesAnyDay(data, br));

    // Build ordered rows (slots + breaks by time)
    const rows = [];
    let bi = 0;
    for (const slot of slots) {
      while (bi < activeBreaks.length && parseTime(activeBreaks[bi].start) <= parseTime(slot.start)) {
        const b = activeBreaks[bi++];
        rows.push({ kind: "break", start: b.start, end: b.end, label: b.label });
      }
      rows.push({ kind: "slot", start: slot.start, end: slot.end });
    }
    while (bi < activeBreaks.length) {
      const b = activeBreaks[bi++];
      rows.push({ kind: "break", start: b.start, end: b.end, label: b.label });
    }

    // Remove consecutive breaks
    const compact = [];
    for (const r of rows) {
      if (r.kind === "break" && compact.length && compact[compact.length - 1].kind === "break") continue;
      compact.push(r);
    }

    // Index sessions per day+start
    const byDayStart = Array.from({ length: 5 }, () => new Map());
    for (const s of data) {
      const d = Number(s.day);
      if (!(d >= 0 && d < 5)) continue;
      const k = String(s.start);
      if (!byDayStart[d].has(k)) byDayStart[d].set(k, []);
      byDayStart[d].get(k).push(s);
    }

    let html = `
      <div style="
        display:grid;
        grid-template-columns:110px repeat(5, 1fr);
        gap:10px;
        align-items:stretch;
      ">
        <div style="font-weight:800;">Hora</div>
        ${DAY_LABELS.map(d => `<div style="font-weight:800;">${d}</div>`).join("")}
    `;

    for (const row of compact) {
      if (row.kind === "break") {
        html += `<div style="opacity:.85;">${escapeHtml(row.start)}<br>${escapeHtml(row.end)}</div>`;
        html += breakRowHtml(row.label);
        continue;
      }

      html += `<div style="opacity:.85;">${escapeHtml(row.start)}<br>${escapeHtml(row.end)}</div>`;
      for (let d = 0; d < 5; d++) {
        const list = byDayStart[d].get(String(row.start)) || [];
        if (!list.length) {
          html += `<div style="border:1px dashed rgba(0,0,0,.12); border-radius:10px;"></div>`;
        } else {
          html += `<div>${list.map(sessionCardHtml).join("")}</div>`;
        }
      }
    }

    html += `</div>`;
    scheduleOut.innerHTML = html;
  }

  async function init() {
    await loadData();
    rebuildEntitySelect();

    if (btnByClass) btnByClass.onclick = () => setMode("class");
    if (btnByTeacher) btnByTeacher.onclick = () => setMode("teacher");

    renderBtn.onclick = renderSchedule;

    entitySelect.addEventListener("change", () => { if (entitySelect.value) renderSchedule(); });
    trimSelect.addEventListener("change", () => { if (entitySelect.value) renderSchedule(); });
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
