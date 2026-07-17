import { command, configured, send } from './_redis.js';

export default async function handler(req, res) {
  if (!configured()) return send(res, 503, { players: [] });
  try {
    if (req.method === 'POST') {
      const p = req.body || {};
      const safe = {
        id: String(p.id).slice(0, 80), x: Math.max(0, Math.min(700, Number(p.x))),
        lane: Math.max(0, Math.min(1, Number(p.lane) || 0)),
        skin: String(p.skin).slice(0, 20),
        name: String(p.name || '').trim().slice(0, 16),
        nameColor: /^#[0-9a-f]{6}$/i.test(p.nameColor) ? p.nameColor : '#f0c849',
        dir: Number(p.dir) < 0 ? -1 : 1, t: Date.now()
      };
      await command(['LPUSH', 'mur:presence', JSON.stringify(safe)]);
      await command(['LTRIM', 'mur:presence', '0', '199']);
    }
    if (!['GET', 'POST'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' });
    const raw = await command(['LRANGE', 'mur:presence', '0', '199']);
    const latest = new Map();
    raw.map(JSON.parse).forEach(p => { if (!latest.has(p.id) && Date.now() - p.t < 15000) latest.set(p.id, p); });
    return send(res, 200, { players: [...latest.values()] });
  } catch {
    return send(res, 500, { players: [] });
  }
}
