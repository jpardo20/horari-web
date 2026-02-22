// js/state/sessionState.js

let originalSessions = [];
let workingSessions = [];
let dirtyIds = new Set();

/**
 * Inicialitza l'estat a partir del JSON carregat.
 * Genera un _id intern per cada sessió.
 */
export function initSessions(rawSessions) {
  originalSessions = rawSessions.map((s, index) => ({
    _id: `S${index.toString().padStart(4, "0")}`,
    ...s
  }));

  // deep clone simple
  workingSessions = originalSessions.map(s => ({ ...s }));
  dirtyIds = new Set();
}

/**
 * Retorna totes les sessions editables.
 */
export function getSessions() {
  return workingSessions;
}

/**
 * Actualitza un camp d'una sessió.
 */
export function updateSession(id, field, value) {
  const session = workingSessions.find(s => s._id === id);
  if (!session) return;

  session[field] = value;

  const original = originalSessions.find(s => s._id === id);

  // detecta si és diferent de l'original
  const isDirty = Object.keys(original).some(
    key => original[key] !== session[key]
  );

  if (isDirty) {
    dirtyIds.add(id);
  } else {
    dirtyIds.delete(id);
  }
}

/**
 * Retorna només les sessions modificades.
 */
export function getDirtySessions() {
  return workingSessions.filter(s => dirtyIds.has(s._id));
}

/**
 * Retorna si hi ha canvis pendents.
 */
export function hasChanges() {
  return dirtyIds.size > 0;
}


/**
 * Comprova si hi ha solapament amb una altra sessió
 */
function hasOverlap(target, others) {
  return others.some(s =>
    s._id !== target._id &&
    s.day === target.day &&
    s.trimester === target.trimester &&
    (
      s.groupId === target.groupId ||
      s.teacherId === target.teacherId
    ) &&
    (
      target.start < s.end &&
      target.end > s.start
    )
  );
}

/**
 * Mou una sessió a una nova franja.
 */
export function moveSession(id, newDay, newStart, newEnd) {
  const session = workingSessions.find(s => s._id === id);
  if (!session) {
    throw new Error("Sessió no trobada.");
  }

  const updated = {
    ...session,
    day: newDay,
    start: newStart,
    end: newEnd
  };

  if (hasOverlap(updated, workingSessions)) {
    throw new Error("Solapament detectat amb una altra sessió.");
  }

  updateSession(id, "day", newDay);
  updateSession(id, "start", newStart);
  updateSession(id, "end", newEnd);
}

/**
 * Reverteix tots els canvis.
 */
export function resetChanges() {
  workingSessions = originalSessions.map(s => ({ ...s }));
  dirtyIds.clear();
}