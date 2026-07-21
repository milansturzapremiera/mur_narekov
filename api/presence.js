import { command, configured, send } from './_redis.js';

export default async function handler(req, res) {
  if (!configured()) return send(res, 503, { players: [] });
  try {
    const zomriBagVersion = String(process.env.ZOMRI_BAG_VERSION || '1').trim().slice(0, 32) || '1';
    const civavaCompanionVersion = String(process.env.CIVAVA_COMPANION_VERSION || '1').trim().slice(0, 32) || '1';
    if (req.method === 'POST') {
      const p = req.body || {};
      const playerBagVersion = String(p.zomriBagVersion || '1').trim().slice(0, 32) || '1';
      const playerCompanionVersion = String(p.civavaCompanionVersion || '1').trim().slice(0, 32) || '1';
      const safe = {
        id: String(p.id).slice(0, 80), x: Math.max(0, Math.min(700, Number(p.x))),
        lane: Math.max(0, Math.min(1, Number(p.lane) || 0)),
        skin: String(p.skin).slice(0, 20),
        name: String(p.name || '').trim().slice(0, 16),
        nameColor: /^#[0-9a-f]{6}$/i.test(p.nameColor) ? p.nameColor : '#f0c849',
        zomriBag: p.zomriBag === true && playerBagVersion === zomriBagVersion,
        zomriBagVersion: playerBagVersion,
        civavaCompanion: p.civavaCompanion === true && playerCompanionVersion === civavaCompanionVersion,
        civavaCompanionVersion: playerCompanionVersion,
        dir: Number(p.dir) < 0 ? -1 : 1,
        velocity: Math.max(-60, Math.min(60, Number(p.velocity) || 0)),
        running: p.running === true, disconnected: p.disconnected === true,
        t: Date.now()
      };
      await command(['LPUSH', 'mur:presence', JSON.stringify(safe)]);
      await command(['LTRIM', 'mur:presence', '0', '199']);
    }
    if (!['GET', 'POST'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' });
    const raw = await command(['LRANGE', 'mur:presence', '0', '199']);
    const latest = new Map(), seen = new Set();
    raw.map(JSON.parse).forEach(p => { if(seen.has(p.id))return;seen.add(p.id);if(!p.disconnected&&Date.now()-p.t<15000)latest.set(p.id,p); });
    const players = [...latest.values()].map(player => ({
      ...player,
      zomriBag: player.zomriBag === true && String(player.zomriBagVersion || '1') === zomriBagVersion,
      civavaCompanion: player.civavaCompanion === true && String(player.civavaCompanionVersion || '1') === civavaCompanionVersion
    }));
    return send(res, 200, { players, zomriBagVersion, civavaCompanionVersion });
  } catch {
    return send(res, 500, { players: [] });
  }
}
