// The gateway signs visitor IPs. Never trust forwarding headers without this proof.
const encoder = new TextEncoder();
export async function gatewaySignature(secret: string, method: string, path: string, ip: string, timestamp: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify([method, path, ip, timestamp])));
  return Array.from(new Uint8Array(signature), n => n.toString(16).padStart(2, '0')).join('');
}
export async function gatewayVisitorIp(req: Request, secret?: string, now = Date.now()) {
  const fallback = req.headers.get('cf-connecting-ip') || 'unknown';
  if (!secret) return fallback;
  const ip = req.headers.get('x-vayrox-visitor-ip') || '';
  const time = req.headers.get('x-vayrox-timestamp') || '';
  const proof = req.headers.get('x-vayrox-signature') || '';
  if (!ip || ip.length > 64 || !/^\d{13}$/.test(time) || Math.abs(now - Number(time)) > 60000 || !/^[a-f0-9]{64}$/.test(proof)) return fallback;
  const url = new URL(req.url);
  const expected = await gatewaySignature(secret, req.method, url.pathname + url.search, ip, time);
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ proof.charCodeAt(i);
  return mismatch === 0 ? ip : fallback;
}
