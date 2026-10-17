export const yeniId = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, '');

export const GUN = 24 * 60 * 60 * 1000;

export function bugunStr(t = new Date()) {
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function gunOnce(zaman: number | null, simdi = Date.now()) {
  if (zaman == null) return null;
  return Math.max(0, Math.floor((simdi - zaman) / GUN));
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
