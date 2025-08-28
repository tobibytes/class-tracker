export const API_BASE: string = import.meta.env.VITE_API_BASE_URL || '';

export async function getNext() {
  const res = await fetch(`${API_BASE}/api/next`);
  return res.json();
}

export async function getToday() {
  const res = await fetch(`${API_BASE}/api/today`);
  return res.json();
}

export async function getConfig() {
  const res = await fetch(`${API_BASE}/api/config`);
  return res.json();
}

