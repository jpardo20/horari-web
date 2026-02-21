/**
 * Core formatting utilities
 */

const DAY_MAP = {
  1: "Dilluns",
  2: "Dimarts",
  3: "Dimecres",
  4: "Dijous",
  5: "Divendres"
};

export function formatDay(day) {
  return DAY_MAP[day] || day;
}
