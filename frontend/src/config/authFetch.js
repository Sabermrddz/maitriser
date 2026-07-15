import { fetchWithAuth, API_BASE_URL } from './api';

export async function authFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  return fetchWithAuth(url, options);
}
