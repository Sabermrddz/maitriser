import { fetchWithAuth, API_BASE_URL } from '../config/api';

// Popup-safe file opener: opens a blank window synchronously (inside the user
// gesture, so popup blockers allow it), then navigates it to a fetched blob
// object URL. Returns false when blocked or on fetch error (window is closed).
export async function openFileInNewTab(path) {
  const win = window.open('', '_blank');
  if (!win) return false;
  try {
    const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    win.location = objectUrl;
    win.opener = null;
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return true;
  } catch {
    win.close();
    return false;
  }
}
