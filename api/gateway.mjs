import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHmac } from 'node:crypto';

const backend = new URL('https://vayrox-ai.vs26bf9tsc.chatgpt.site');
const forbidden = /^(host|connection|content-length|accept-encoding|transfer-encoding|forwarded|x-forwarded-.*|x-real-ip|x-vercel-.*|cf-.*|oai-.*|openai-.*|x-vayrox-.*)$/i;
const responseForbidden = /^(connection|transfer-encoding|content-encoding|content-length|set-cookie|server|cf-.*)$/i;
export const config = { api: { bodyParser: false }, maxDuration: 300 };

export async function forward(req, res, upstreamFetch = fetch) {
  const incoming = new URL(req.url, 'https://gateway.invalid');
  const path = incoming.searchParams.get('__vayrox_path') || '';
  incoming.searchParams.delete('__vayrox_path');
  // Build a path, never resolve a client-supplied URL against the backend.
  const target = new URL(backend.origin);
  target.pathname = '/' + path;
  target.search = incoming.search;
  if (path === 'api/gateway.mjs' || path === 'api/gateway') {
    res.statusCode = 404; res.end('Not found'); return;
  }
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!forbidden.test(key) && value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  const host = req.headers.host;
  if (typeof host !== 'string' || !/^[a-zA-Z0-9.-]+(?::\d+)?$/.test(host)) {res.statusCode=400;res.end('Invalid host');return;}
  const publicOrigin = 'https://' + host;
  const origin = headers.get('origin');
  // Preserve foreign origins for CSRF/CORS rejection by the application.
  if (origin === publicOrigin) headers.set('origin', backend.origin);
  headers.set('accept-encoding', 'identity');
  const secret = process.env.VAYROX_GATEWAY_SECRET;
  // Vercel overwrites x-vercel-forwarded-for; never use client x-forwarded-for.
  const ipHeader = req.headers['x-vercel-forwarded-for'];
  const ip = typeof ipHeader === 'string' ? ipHeader.split(',')[0].trim() : '';
  if (secret && ip && ip.length <= 64) {
    const timestamp = String(Date.now());
    const signature = createHmac('sha256', secret).update(JSON.stringify([req.method, target.pathname + target.search, ip, timestamp])).digest('hex');
    headers.set('x-vayrox-visitor-ip', ip);
    headers.set('x-vayrox-timestamp', timestamp);
    headers.set('x-vayrox-signature', signature);
  }
  const controller = new AbortController();
  req.on('aborted', () => controller.abort());
  res.on('close', () => {if (!res.writableEnded) controller.abort();});
  try {
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const response = await upstreamFetch(target, {method:req.method,headers,body:hasBody?Readable.toWeb(req):undefined,duplex:hasBody?'half':undefined,redirect:'manual',signal:controller.signal});
    res.statusCode = response.status;
    response.headers.forEach((value,key) => {
      if (responseForbidden.test(key)) return;
      if (key === 'location') {
        const location = new URL(value, backend);
        if (location.origin === backend.origin) value = publicOrigin + location.pathname + location.search + location.hash;
      }
      if (key === 'access-control-allow-origin' && value === backend.origin && origin === publicOrigin) value = publicOrigin;
      res.setHeader(key,value);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie',cookies.map(value => value.replace(/;\s*Domain=[^;]*/gi,'')));
    // All identity-bearing responses stay private; do not cache RSC or auth HTML.
    res.setHeader('cache-control','private, no-store');
    res.setHeader('x-content-type-options','nosniff');
    if (response.body && req.method !== 'HEAD') await pipeline(Readable.fromWeb(response.body),res);
    else res.end();
  } catch {
    if (!res.headersSent) {res.statusCode=502;res.setHeader('content-type','application/json');res.end(JSON.stringify({error:'Vayrox AI is temporarily unavailable. Please retry.'}));}
    else res.destroy();
  }
}
export default forward;
