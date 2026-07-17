import { command, configured, send } from './_redis.js';
import { createHash } from 'node:crypto';

const MESSAGE_LIMIT = 20;

function writerKey(value) {
  const id = String(value || '');
  if (id.length < 16 || id.length > 128 || !/^[a-z0-9-]+$/i.test(id)) return null;
  return `mur:writer:${createHash('sha256').update(id).digest('hex')}`;
}

export default async function handler(req, res) {
  if (!configured()) return send(res, 503, { mode: 'local', items: [] });
  try {
    if (req.method === 'GET') {
      const raw = await command(['LRANGE', 'mur:graffiti', '0', '4999']);
      const key = writerKey(req.headers['x-writer-id']);
      const hasWritten = key ? Number(await command(['EXISTS', key])) === 1 : false;
      return send(res, 200, { mode: 'shared', items: raw.map(JSON.parse), hasWritten });
    }
    if (req.method === 'POST') {
      const item = req.body;
      const key = writerKey(item?.writerId);
      if (!key) return send(res, 400, { error: 'Chýba anonymný identifikátor prehliadača.' });
      if (!item || typeof item.text !== 'string' || [...item.text].length < 1 || [...item.text].length > MESSAGE_LIMIT) {
        return send(res, 400, { error: 'Neplatný nápis.' });
      }
      const safe = {
        id: String(item.id).slice(0, 80), name: [...String(item.name || 'Anonym').trim()].slice(0, 16).join('') || 'Anonym', text: [...item.text.trim()].slice(0, MESSAGE_LIMIT).join(''),
        x: Math.max(0, Math.min(700, Number(item.x))), y: Math.max(.08, Math.min(.88, Number(item.y))),
        color: /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#f2e8d5',
        font: String(item.font).slice(0, 40),
        angle: Math.max(-12, Math.min(12, Number(item.angle) || 0)),
        size: Math.max(18, Math.min(56, Number(item.size) || 32)),
        wrap: item.wrap === true,
        createdAt: Date.now()
      };
      const script = "if redis.call('EXISTS',KEYS[1]) == 1 then return 0 end; redis.call('SET',KEYS[1],'1'); redis.call('LPUSH',KEYS[2],ARGV[1]); redis.call('LTRIM',KEYS[2],0,4999); return 1";
      const created = Number(await command(['EVAL', script, '2', key, 'mur:graffiti', JSON.stringify(safe)]));
      if (created !== 1) return send(res, 409, { error: 'Tento prehliadač už svoj odkaz zanechal.' });
      return send(res, 201, { item: safe });
    }
    return send(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return send(res, 500, { error: 'Stena je dočasne nedostupná.' });
  }
}
