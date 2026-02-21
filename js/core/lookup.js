/**
 * Build fast lookup maps by id.
 * Pure utility functions (no DOM).
 */

export function buildMapByKey(array, keyField) {
  if (!Array.isArray(array)) return {};
  return array.reduce((acc, item) => {
    acc[item[keyField]] = item;
    return acc;
  }, {});
}
