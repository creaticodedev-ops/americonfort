/**
 * Shared list query helpers for owner admin modules.
 */

export const parsePagination = (query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const parseSort = (sortRaw, allowed = {}, fallback = { createdAt: -1 }) => {
  const raw = String(sortRaw || '').trim();
  if (!raw) return fallback;
  const desc = raw.startsWith('-');
  const field = desc ? raw.slice(1) : raw;
  if (!allowed[field]) return fallback;
  return { [field]: desc ? -1 : 1 };
};

export const parseDateRange = (from, to, field = 'createdAt') => {
  if (!from && !to) return null;
  const range = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) range.$gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      range.$lte = d;
    }
  }
  if (!Object.keys(range).length) return null;
  return { [field]: range };
};

export const escapeRegex = (value) =>
  String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default {
  parsePagination,
  parseSort,
  parseDateRange,
  escapeRegex,
};
