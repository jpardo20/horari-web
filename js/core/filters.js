/**
 * Core filters (pure functions)
 * Compatible with sessions.json structure:
 * ['day','end','groupId','room','start','subjectId','teacherId','trimester']
 */

export function filterSessions(
  sessions,
  { trimester = null, groupId = null, teacherId = null } = {}
) {
  if (!Array.isArray(sessions)) return [];

  return sessions.filter((s) => {
    if (trimester && String(s.trimester) !== String(trimester)) return false;
    if (groupId && String(s.groupId) !== String(groupId)) return false;
    if (teacherId && String(s.teacherId) !== String(teacherId)) return false;
    return true;
  });
}

export function uniqueSorted(values) {
  return Array.from(
    new Set(values.filter((v) => v !== null && v !== undefined && v !== ""))
  ).sort((a, b) => String(a).localeCompare(String(b), "ca"));
}
