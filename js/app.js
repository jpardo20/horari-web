/* ============================================================
* HORARI - app.js
* - Compatible amb index.html que fa servir: #entitySelect, #trimSelect, #renderBtn, #schedule
* - Modes: per classe / per professor (mateix <select>)
* - Llegeix dades de:
*    ../data/sessions.json
*    ../data/professors.json
*    ../data/rols.json
*   (amb fallback automàtic si la ruta no existeix)
* ============================================================ */

import { renderTimetable } from "./core/renderTimetable.js";


    // ---------- Utils DOM ----------
    function qs(sel, root = document) { return root.querySelector(sel); }
    function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
    function byId(id) { return document.getElementById(id); }

    function getEl(...candidates) {
        for (const c of candidates) {
            if (!c) continue;
            if (c.startsWith("#") || c.startsWith(".") || c.includes("[")) {
                const el = qs(c);
                if (el) return el;
            } else {
                const el = byId(c);
                if (el) return el;
            }
        }
        return null;
    }

    function escapeHtml(s) {
        return String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    // ---------- Dades ----------
    let sessions = [];
    let professors = []; // [{id,name}]
    let rols = [];       // [{id,name}]  (rol -> nom professor)
    let descansos = []; // [{start,end,label}]

    // afegit 1
    let assignatures = [];
    let assignaturaById = new Map();
    // afegit 1

    // Mapes ràpids
    let profById = new Map();
    let rolById = new Map();

    // ---------- Controls (robust) ----------
    const btnByClass = getEl('btnByClass', 'btnClass', 'btnPerClasse', '[data-mode="class"]', '#btnClass');
    const btnByTeacher = getEl('btnByTeacher', 'btnTeacher', 'btnPerProfessor', '[data-mode="teacher"]', '#btnTeacher');

    const selectLabel = getEl('selectLabel', 'entityLabel', 'lblEntity', '#selectLabel');
    const entitySelect = getEl('entitySelect', 'classSelect', 'teacherSelect', 'professorSelect', '#entitySelect');
    const trimSelect = getEl('trimSelect', 'trimesterSelect', 'trimestreSelect', '#trimSelect');
    const renderBtn = getEl('renderBtn', 'showBtn', 'btnShow', 'btnMostra', '#renderBtn');
    const scheduleOut = getEl('schedule', 'scheduleGrid', 'scheduleTable', '#schedule');

    // Afegit per activar/desactivar els botons Classe/Profe
    const botoClasse = document.getElementById("botoClasse");
    const botoProfe = document.getElementById("botoProfe")

    // Si algun element clau no existeix, no petem: mostrem avis a consola.
    function assertDom() {
        const missing = [];
        if (!entitySelect) missing.push("entitySelect");
        if (!trimSelect) missing.push("trimSelect");
        if (!renderBtn) missing.push("renderBtn");
        if (!scheduleOut) missing.push("schedule");
        if (missing.length) {
            console.warn("⚠️ app.js: falten elements al DOM:", missing.join(", "));
        }
    }

    // ---------- Config ----------
    let MODE = "class"; // "class" | "teacher"
    const DAY_LABELS = new Map([
        [1, "Dilluns"],
        [2, "Dimarts"],
        [3, "Dimecres"],
        [4, "Dijous"],
        [5, "Divendres"]
    ]);

    // ---------- Fetch robust ----------
    async function fetchJsonWithFallback(paths) {
        let lastErr = null;
        for (const path of paths) {
            try {
                const res = await fetch(path, { cache: "no-store" });
                if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
                // si el servidor retorna HTML (404), això petaria en json() -> ho capturem
                const text = await res.text();
                try {
                    return JSON.parse(text);
                } catch {
                    throw new Error(`Resposta no és JSON (${path})`);
                }
            } catch (e) {
                lastErr = e;
            }
        }
        throw lastErr ?? new Error("No s'ha pogut carregar JSON");
    }

    async function loadData() {
        // IMPORTANT: app.js viu a /js; per això primer provem ../data
        const sessionsPaths = ["../data/sessions.json", "data/sessions.json", "sessions.json"];
        const profPaths = ["../data/professors.json", "data/professors.json", "professors.json"];
        const rolsPaths = ["../data/rols.json", "data/rols.json", "rols.json", "../data/roles.json", "data/roles.json", "roles.json"];
        // afegit 2
        const assignaturesPaths = [
            "../data/assignatures.json",
            "data/assignatures.json",
            "assignatures.json"
        ];
        const descansosPaths = ["../data/descansos.json", "data/descansos.json", "descansos.json"];

        assignatures = await fetchJsonWithFallback(assignaturesPaths).catch(() => []);

        assignaturaById = new Map();
        for (const a of assignatures) {
            if (!a || !a.subjectId) continue;
            assignaturaById.set(a.subjectId, a.name ?? a.subjectId);
        }

        // afegit 2
        // Carreguem en paral·lel amb fallbacks
        const [s, p, r, d] = await Promise.all([
            fetchJsonWithFallback(sessionsPaths),
            fetchJsonWithFallback(profPaths).catch(() => []),
            fetchJsonWithFallback(rolsPaths).catch(() => []),
            fetchJsonWithFallback(descansosPaths).catch(() => [])
        ]);
        sessions = Array.isArray(s) ? s : [];
        professors = Array.isArray(p) ? p : [];
        rols = Array.isArray(r) ? r : [];
        descansos = Array.isArray(d) ? d : [];

        // Mapes
        profById = new Map();
        for (const it of professors) {
            if (!it || !it.id) continue;
            if (!profById.has(it.id)) profById.set(it.id, it.name ?? it.id);
        }
        rolById = new Map();
        for (const it of rols) {
            if (!it || !it.id) continue;
            if (!rolById.has(it.id)) rolById.set(it.id, it.name ?? it.id);
        }
    }

    // === Colors: auto-generated from subjectId ===
    function hashStr(s) {
        let h = 5381;
        for (let i = 0; i < s.length; i++) {
            h = ((h << 5) + h) + s.charCodeAt(i);
        }
        return h >>> 0;
    }
    const PALETTE = [
        { bg: '#E8F1FF', border: '#C9DFFF' }, { bg: '#EAFBF1', border: '#C8F2DD' },
        { bg: '#FFF2E5', border: '#FFD7B8' }, { bg: '#F8EAFE', border: '#EBCDFD' },
        { bg: '#FDECF0', border: '#F8CDD6' }, { bg: '#EAF7FE', border: '#CDEBFD' },
        { bg: '#EFFFF4', border: '#D4FBE3' }, { bg: '#FFFDEB', border: '#FFF4B8' },
        { bg: '#E9F5FF', border: '#CFE9FF' }, { bg: '#F2E9FF', border: '#E0CFFF' },
        { bg: '#FFE9F7', border: '#FFCFEA' }, { bg: '#E9FFF7', border: '#CFF7EA' }
    ];

    function colorForSubjectItem(s) {
        const code = s.subjectId || '';
        const i = hashStr(code) % PALETTE.length;
        const { bg, border } = PALETTE[i];
        return { bg, border, text: '#1f2937' };
    }


    // ---------- Resolució de noms ----------
    function resolveTeacherName(teacherId) {
        if (!teacherId) return "";
        if (rolById.has(teacherId)) return rolById.get(teacherId);
        if (profById.has(teacherId)) return profById.get(teacherId);
        // Si ja ve com a nom (p.ex. "Centre")
        return teacherId;
    }

    // Resolver el nom de l’assignatura
    function resolveSubjectName(subjectId) {
        if (!subjectId) return "";
        return assignaturaById.get(subjectId) || subjectId;
    }

    // ---------- Options de selects ----------
    function uniq(arr) {
        return Array.from(new Set(arr));
    }

    function getAvailableGroups() {
        return uniq(sessions.map(s => s.groupId).filter(Boolean)).sort();
    }

    function getAvailableTrimesters() {
        const ts = uniq(sessions.map(s => s.trimester).filter(t => t !== undefined && t !== null));
        // numèric si pot
        return ts.sort((a, b) => Number(a) - Number(b));
    }

    function getAvailableTeachers() {
        // Prioritat: noms resolts a partir de sessions (perquè no surti gent que no hi surt mai)
        const names = sessions.map(s => resolveTeacherName(s.teacherId)).filter(Boolean);
        const unique = uniq(names);

        // Ordenem i posem "Centre" al final si hi és
        unique.sort((a, b) => a.localeCompare(b, "ca"));
        const iCentre = unique.findIndex(n => n.toLowerCase() === "centre");
        if (iCentre >= 0) {
            const [c] = unique.splice(iCentre, 1);
            unique.push(c);
        }
        return unique;
    }

    function setSelectOptions(select, items, { placeholder = "— Selecciona —", valueFn = x => x, labelFn = x => x } = {}) {
        if (!select) return;
        const curr = select.value;
        select.innerHTML = "";
        const opt0 = document.createElement("option");
        opt0.value = "";
        opt0.textContent = placeholder;
        select.appendChild(opt0);

        for (const it of items) {
            const opt = document.createElement("option");
            opt.value = valueFn(it);
            opt.textContent = labelFn(it);
            select.appendChild(opt);
        }
        // intenta mantenir selecció si encara existeix
        const still = Array.from(select.options).some(o => o.value === curr);
        if (still) select.value = curr;
    }

    function ensureTrimesterOptions() {
        if (!trimSelect) return;
        // Si el HTML ja té opcions, no toquem res.
        if (trimSelect.options && trimSelect.options.length > 1) return;

        const tr = getAvailableTrimesters();
        setSelectOptions(trimSelect, tr, {
            placeholder: "— Trimestre —",
            valueFn: t => String(t),
            labelFn: t => {
                const n = Number(t);
                if (Number.isFinite(n)) return (n === 1 ? "1r" : n === 2 ? "2n" : n === 3 ? "3r" : String(t));
                return String(t);
            }
        });
    }

    function rebuildEntitySelect() {
        if (!entitySelect) return;

        if (MODE === "class") {
            if (selectLabel) {
                selectLabel.textContent = "Classe:";
                botoClasse.classList.add("selected");
                botoProfe.classList.remove("selected");
            }
            const groups = getAvailableGroups();
            setSelectOptions(entitySelect, groups, {
                placeholder: "— Selecciona —",
                valueFn: g => g,
                labelFn: g => g
            });
        } else {
            if (selectLabel) {
                selectLabel.textContent = "Professor:";
                botoProfe.classList.add("selected");
                botoClasse.classList.remove("selected");
            }
            const teachers = getAvailableTeachers();
            setSelectOptions(entitySelect, teachers, {
                placeholder: "— Selecciona —",
                valueFn: n => n,   // seleccionem pel nom resolt
                labelFn: n => n
            });
        }
    }

    // ---------- Render ----------
    function parseTime(t) {
        // "08:20" -> minuts des de 00:00
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
            if (!slots.has(key)) {
                slots.set(key, { start, end });
            }
        }
        const arr = Array.from(slots.values());
        arr.sort((a, b) => parseTime(a.start) - parseTime(b.start));
        return arr;
    }

    function matchTrimester(s, t) {
        if (!t) return true;
        // t pot venir com "1r" etc en algun HTML; normalitzem
        const norm = String(t).replace(/[^\d]/g, "");
        if (!norm) return true;
        return String(s.trimester) === norm;
    }

    function filterSessions() {
        const selected = entitySelect ? entitySelect.value : "";
        const trim = trimSelect ? trimSelect.value : "";

        if (!selected) return [];

        if (MODE === "class") {
            return sessions.filter(s => s.groupId === selected && matchTrimester(s, trim));
        } else {
            // selected és un NOM (resolt)
            return sessions.filter(s => resolveTeacherName(s.teacherId) === selected && matchTrimester(s, trim));
        }
    }

    function sessionCardHtml(s) {
        const teacher = escapeHtml(resolveTeacherName(s.teacherId) || "");
        const room = s.room ? ` · ${escapeHtml(s.room)}` : "";
        const extra = teacher ? `${teacher}${room}` : `${room}`.replace(/^ · /, "");

        const subjectCode = s.subjectId ?? "";
        const subjectName = resolveSubjectName(subjectCode);

        // 🎨 Color segons assignatura
        const { bg, border, text } = colorForSubjectItem(s);

        return `
    <div style="
      border:1px solid ${border};
      border-radius:10px;
      padding:10px 12px;
      background:${bg};
      color:${text};
      line-height:1.2;
    ">
      <div style="font-weight:700; margin-bottom:4px;">
        ${escapeHtml(subjectCode)} - ${escapeHtml(subjectName)}
      </div>
      <div style="opacity:.85; font-size:0.95em;">
        ${extra || "—"}
      </div>
    </div>
  `;
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

    function buildRowsWithBreaks(timeSlots, filteredSessions) {
        // Normalitzem descansos, ordenats per hora
        const breaks = (Array.isArray(descansos) ? descansos : [])
            .filter(b => b && b.start && b.end)
            .slice()
            .sort((a, b) => parseTime(a.start) - parseTime(b.start));

        const rows = [];
        let i = 0;

        for (const b of breaks) {
            const bStart = parseTime(b.start);

            // Afegim tots els slots que comencen abans del descans
            while (i < timeSlots.length && parseTime(timeSlots[i].start) < bStart) {
                rows.push({ kind: "slot", slot: timeSlots[i] });
                i++;
            }

            // Afegim el descans només si toca (sessions abans i després)
            if (shouldShowBreak(b, filteredSessions)) {
                rows.push({ kind: "break", br: b });
            }
        }

        // Resta de slots
        while (i < timeSlots.length) {
            rows.push({ kind: "slot", slot: timeSlots[i] });
            i++;
        }

        return rows;
    }

    function renderSchedule() {
        if (!scheduleOut) return;

        const data = filterSessions();
        scheduleOut.innerHTML = "";

        if (!data.length) {
            scheduleOut.innerHTML = `<p style="padding:12px; color:#444;">No hi ha sessions per a aquesta selecció.</p>`;
            return;
        }

        // Detecta si hi ha descans (dia=0) per aquests horaris
        const slots = getTimeSlots(data);
        const rows = buildRowsWithBreaks(slots, data);


        // Construïm índex per accés ràpid: key day-start-end -> sessions[]
        const map = new Map();
        for (const s of data) {
            const day = Number(s.day);
            const key = `${day}|${s.start}|${s.end}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(s);
        }

        // Wrapper grid
        const days = [1, 2, 3, 4, 5];

        // Capçalera
        let html = `
      <div style="display:grid; grid-template-columns: 110px repeat(5, 1fr); gap:10px; align-items:stretch;">
        <div style="background:#0aa; color:#fff; font-weight:800; padding:10px; border-radius:10px; text-align:center;">Hora</div>
        ${days.map(d => `
          <div style="background:#0aa; color:#fff; font-weight:800; padding:10px; border-radius:10px; text-align:center;">
            ${DAY_LABELS.get(d) || ""}
          </div>
        `).join("")}
    `;

        for (const row of rows) {
            if (row.kind === "break") {
                const label = row.br.label || "DESCANS";
                html += `
      <div style="background:#0aa; color:#fff; font-weight:800; padding:10px; border-radius:10px; text-align:center;">
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

            html += `
      <div style="background:#0aa; color:#fff; font-weight:800; padding:10px; border-radius:10px; text-align:center;">
        ${tLabel}
      </div>
    `;

            for (const d of days) {
                const key = `${d}|${slot.start}|${slot.end}`;
                const cellSessions = map.get(key) || [];
                const cell = cellSessions.length
                    ? cellSessions.map(sessionCardHtml).join(`<div style="height:8px;"></div>`)
                    : `<div style="padding:10px 12px; color:#999;">—</div>`;

                html += `
      <div style="border:1px solid rgba(0,0,0,.12); border-radius:10px; padding:10px; min-height:72px; background:#fff;">
        ${cell}
      </div>
    `;
            }
        }

        html += `</div>`;
        scheduleOut.innerHTML = html;
    }
    // ---------- Events ----------
    function setMode(mode) {
        MODE = mode === "teacher" ? "teacher" : "class";

        // Estil "actiu" (si existeix CSS, millor; sinó fem una mica d'inline)
        if (btnByClass) btnByClass.classList.toggle("active", MODE === "class");
        if (btnByTeacher) btnByTeacher.classList.toggle("active", MODE === "teacher");

        rebuildEntitySelect();
        renderSchedule(); // refresc immediat (si ja hi havia selecció)
    }

    function bindEvents() {
        if (btnByClass) btnByClass.addEventListener("click", () => setMode("class"));
        if (btnByTeacher) btnByTeacher.addEventListener("click", () => setMode("teacher"));

        if (renderBtn) renderBtn.addEventListener("click", () => renderSchedule());
        if (entitySelect) entitySelect.addEventListener("change", () => renderSchedule());
        if (trimSelect) trimSelect.addEventListener("change", () => renderSchedule());
    }

    // ---------- INIT ----------
    async function init() {
        assertDom();

        try {
            await loadData();
        } catch (e) {
            console.error("❌ No s'han pogut carregar les dades:", e);
            if (scheduleOut) {
                scheduleOut.innerHTML = `<p style="padding:12px; color:#b00;">
          Error carregant dades. Revisa rutes a /data/*.json i consola.
        </p>`;
            }
            return;
        }

        ensureTrimesterOptions();
        bindEvents();

        // Mode inicial segons estat dels botons (si existeixen i tenen classe active)
        const classActive = btnByClass && btnByClass.classList.contains("active");
        const teacherActive = btnByTeacher && btnByTeacher.classList.contains("active");
        if (teacherActive && !classActive) MODE = "teacher";
        else MODE = "class";

        rebuildEntitySelect();
        // No renderitzem res fins que hi hagi selecció, però deixem la pantalla neta.
        if (scheduleOut) scheduleOut.innerHTML = "";
    }

    // Arrencada segura
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
