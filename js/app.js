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
// ✅ FASE 1: fem servir el filtre compartit (mateix que admin)
import { filterSessions as coreFilterSessions } from "./core/filters.js";
import { renderSessionCard } from "./components/sessionCard.js";

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

// // ✅ FASE 1: ara retornem teacherId (no el nom)
// ✅ DEDUP per NOM (no per id)
function getAvailableTeachers() {
    const ids = uniq(sessions.map(s => s.teacherId).filter(Boolean));

    const seenNames = new Set();
    const uniqueIds = [];

    for (const id of ids) {
        const name = resolveTeacherName(id);
        if (!seenNames.has(name)) {
            seenNames.add(name);
            uniqueIds.push(id);
        }
    }

    // Ordenem per nom
    uniqueIds.sort((a, b) =>
        resolveTeacherName(a).localeCompare(resolveTeacherName(b), "ca")
    );

    return uniqueIds;
}

// function getAvailableTeachers() {
//     // teacherId únics a partir de sessions (perquè no surti gent que no hi surt mai)
//     const ids = uniq(sessions.map(s => s.teacherId).filter(Boolean));

//     // Ordenem per nom resolt (visualment igual que abans)
//     ids.sort((a, b) => resolveTeacherName(a).localeCompare(resolveTeacherName(b), "ca"));

//     // Posem "Centre" al final si hi és (mateix comportament visual)
//     const iCentre = ids.findIndex(id => resolveTeacherName(id).toLowerCase() === "centre");
//     if (iCentre >= 0) {
//         const [c] = ids.splice(iCentre, 1);
//         ids.push(c);
//     }
//     return ids;
// }

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
        // ✅ FASE 1: value = teacherId, label = nom (com admin)
        setSelectOptions(entitySelect, teachers, {
            placeholder: "— Selecciona —",
            valueFn: id => id,
            labelFn: id => resolveTeacherName(id)
        });
    }
}

// ---------- Render ----------


// ✅ FASE 1: eliminem matchTrimester i filterSessions local.
// Ara usem coreFilterSessions (mateix que admin) directament.
function getFilteredSessions() {
    const selected = entitySelect ? entitySelect.value : "";
    const trim = trimSelect ? trimSelect.value : "";

    if (!selected) return [];

    if (MODE === "class") {
        return coreFilterSessions(sessions, {
            trimester: trim || null,
            groupId: selected
        });
    } else {
        // selected ara és teacherId (no un nom)
        return coreFilterSessions(sessions, {
            trimester: trim || null,
            teacherId: selected
        });
    }
}



function renderSchedule() {
    if (!scheduleOut) return;

    // ✅ FASE 1: ara fem servir el filtratge compartit
    const data = getFilteredSessions();
    scheduleOut.innerHTML = "";

    if (!data.length) {
        scheduleOut.innerHTML = `<p style="padding:12px; color:#444;">No hi ha sessions per a aquesta selecció.</p>`;
        return;
    }

// 🆕 FASE 1: deleguem el render al motor compartit
renderTimetable(scheduleOut, data, {
    days: [1, 2, 3, 4, 5],
    dayLabels: DAY_LABELS,
    breaks: descansos,
    renderSessionContent: (s) => renderSessionCard(s, {
        resolveTeacherName,
        resolveSubjectName
        })
});


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