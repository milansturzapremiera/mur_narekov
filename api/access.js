import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'mur_access';
const COOKIE_AGE = 60 * 60 * 24 * 30;

function accessToken(password) {
  return createHmac('sha256', password).update('mur-narekov-access-v1').digest('hex');
}

function safelyEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieValue(req) {
  const cookies = String(req.headers.cookie || '').split(';');
  for (const cookie of cookies) {
    const [name, ...value] = cookie.trim().split('=');
    if (name === COOKIE_NAME) return decodeURIComponent(value.join('='));
  }
  return '';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const password = String(process.env.MUR_ACCESS_PASSWORD || '');
  if (!password) return res.status(503).json({ error: 'Vstupné heslo nie je nastavené.' });

  const authenticated = safelyEqual(cookieValue(req), accessToken(password));
  if (req.method === 'GET') return res.status(200).json({ authenticated });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nepovolená metóda.' });

  let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body);}catch{body={};}}
  const submitted = String(body?.password || '').slice(0, 128);
  if (!safelyEqual(submitted, password)) return res.status(401).json({ error: 'Nesprávne heslo.' });

  const secure = String(req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(accessToken(password))}; Path=/; Max-Age=${COOKIE_AGE}; HttpOnly; SameSite=Lax${secure}`);
  return res.status(200).json({ authenticated: true });
}
