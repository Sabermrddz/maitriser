import { API_BASE_URL, fetchWithAuth } from '../config/api';

const PAGE_SIZE = 200;
const MAX_PAGES = 20;

// Pages through /api/quizzes so list views are not silently truncated at the
// 200-row page size. Returns every matching quiz, in server order.
export async function fetchAllQuizzes(searchParams) {
  const params = new URLSearchParams(searchParams);
  params.set('limit', String(PAGE_SIZE));

  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    params.set('page', String(page));
    const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    const items = d.data || (Array.isArray(d) ? d : []);
    all.push(...items);
    const totalPages = Number(d.totalPages) || 1;
    if (items.length === 0 || page >= totalPages) break;
  }
  return all;
}
