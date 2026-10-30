// Helpers for /api/quizzes query parsing.
// Kept pure so they can be unit-tested without a database.

export const MAX_QUESTIONS = 500;

// `course` may be repeated (?course=A&course=B). Returns null when absent,
// a plain string for a single value, or { $in: [...] } for several.
export const parseCourseFilter = (raw) => {
  if (raw === undefined || raw === null) return null;
  const list = (Array.isArray(raw) ? raw : [raw])
    .map((c) => String(c).trim())
    .filter(Boolean);
  if (list.length === 0) return null;
  return list.length === 1 ? list[0] : { $in: list };
};

// Explicit question count for exam sampling. Returns null when not requested.
export const parseCount = (query = {}) => {
  const raw = parseInt(query.count, 10);
  if (!Number.isFinite(raw)) return null;
  return Math.min(MAX_QUESTIONS, Math.max(1, raw));
};

export const wantsRandom = (query = {}) => query.random === 'true' || query.random === '1';
