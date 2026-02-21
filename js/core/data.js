/**
 * Core data loader (shared by public UI and admin UI)
 * - Loads JSON resources from /data
 * - No DOM usage (pure I/O)
 */

export async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${path}`);
  return res.json();
}

export async function loadData(basePath = "data") {
  const paths = {
    sessions: `${basePath}/sessions.json`,
    professors: `${basePath}/professors.json`,
    assignatures: `${basePath}/assignatures.json`,
    rols: `${basePath}/rols.json`,
    descansos: `${basePath}/descansos.json`,
  };

  const [sessions, professors, assignatures, rols, descansos] = await Promise.all([
    fetchJson(paths.sessions),
    fetchJson(paths.professors),
    fetchJson(paths.assignatures),
    fetchJson(paths.rols),
    fetchJson(paths.descansos),
  ]);

  return { sessions, professors, assignatures, rols, descansos };
}
