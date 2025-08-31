const DEFAULT_API = 'http://localhost:4000';
export const API_BASE: string = (import.meta.env.VITE_API_BASE_URL as string) || DEFAULT_API;
console.log(`API_BASE: ${API_BASE}`);
export async function getNext() {
  const res = await fetch(`${API_BASE}/api/next`);
  console.log(res)
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

// New: Canvas import with client-supplied credentials (not persisted on server)
export async function canvasImport(base_url: string, access_token: string) {
  const res = await fetch(`${API_BASE}/api/canvas/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_url, access_token })
  });
  if (!res.ok) throw new Error(`Canvas import failed (${res.status})`);
  return res.json();
}

// New: compute schedule for the provided ephemeral config
export async function computeNext(config: any, now?: string) {
  const res = await fetch(`${API_BASE}/api/compute/next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, now })
  });
  if (!res.ok) throw new Error(`Compute next failed (${res.status})`);
  return res.json();
}

export async function computeToday(config: any, now?: string) {
  const res = await fetch(`${API_BASE}/api/compute/today`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, now })
  });
  if (!res.ok) throw new Error(`Compute today failed (${res.status})`);
  return res.json();
}

