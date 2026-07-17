const environment = Object.entries(process.env);
const integrationValue = suffix => environment.find(([name, value]) => name.endsWith(suffix) && value)?.[1];

const url = process.env.UPSTASH_REDIS_REST_URL
  || process.env.KV_REST_API_URL
  || integrationValue('REST_API_URL');
const token = process.env.UPSTASH_REDIS_REST_TOKEN
  || process.env.KV_REST_API_TOKEN
  || integrationValue('REST_API_TOKEN');

export function configured() { return Boolean(url && token); }

export async function command(parts) {
  const response = await fetch(`${url}/${parts.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`Redis ${response.status}`);
  const data = await response.json();
  return data.result;
}

export function send(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}
