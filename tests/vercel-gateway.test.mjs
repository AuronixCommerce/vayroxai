import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { createHmac } from 'node:crypto';
import { forward } from '../api/gateway.mjs';
async function exercise({origin='https://vayrox.example',path='api/chat',headers={}}={}, response=new Response('data: hello\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream','set-cookie':'vayrox_auth=opaque; Domain=old.example; Path=/; HttpOnly; Secure'}})) {
 const req=Readable.from(['{"messages":[]}']);req.method='POST';req.url='/api/gateway?__vayrox_path='+encodeURIComponent(path)+'&q=one';req.headers={host:'vayrox.example',origin,'oai-authenticated-user-id':'attacker','cf-connecting-ip':'spoof','x-vercel-forwarded-for':'203.0.113.5','x-forwarded-for':'spoof',cookie:'vayrox_guest=opaque',...headers};
 const chunks=[];const outHeaders={};const res=new Writable({write(chunk,encoding,done){chunks.push(chunk);done();}});res.headersSent=false;res.setHeader=(k,v)=>outHeaders[k]=v;
 let target,options;
 await forward(req,res,async(url,opts)=>{target=url;options=opts;return response;});
 return {target,options,headers:outHeaders,body:Buffer.concat(chunks).toString(),status:res.statusCode};
}
test('gateway streams, preserves sessions, and signs only platform visitor IP',async()=>{
 process.env.VAYROX_GATEWAY_SECRET='test-gateway-key';
 const r=await exercise();assert.equal(r.target.origin,'https://vayrox-ai.vs26bf9tsc.chatgpt.site');assert.equal(r.target.pathname,'/api/chat');assert.equal(r.target.search,'?q=one');assert.equal(r.options.headers.get('origin'),r.target.origin);assert.equal(r.options.headers.get('oai-authenticated-user-id'),null);assert.equal(r.options.headers.get('cf-connecting-ip'),null);assert.equal(r.options.headers.get('cookie'),'vayrox_guest=opaque');
 const time=r.options.headers.get('x-vayrox-timestamp');assert.equal(r.options.headers.get('x-vayrox-signature'),createHmac('sha256','test-gateway-key').update(JSON.stringify(['POST','/api/chat?q=one','203.0.113.5',time])).digest('hex'));
 assert.match(r.body,/data: hello/);assert.match(r.headers['set-cookie'][0],/HttpOnly/);assert.doesNotMatch(r.headers['set-cookie'][0],/Domain=/);assert.equal(r.headers['cache-control'],'private, no-store');
});
test('foreign browser origins remain foreign and upstream redirects use public domain',async()=>{
 const r=await exercise({origin:'https://attacker.example'},new Response(null,{status:307,headers:{location:'https://vayrox-ai.vs26bf9tsc.chatgpt.site/login'}}));assert.equal(r.options.headers.get('origin'),'https://attacker.example');assert.equal(r.headers.location,'https://vayrox.example/login');assert.equal(r.status,307);
});
test('path cannot replace fixed backend host',async()=>{const r=await exercise({path:'//attacker.example/x'});assert.equal(r.target.hostname,'vayrox-ai.vs26bf9tsc.chatgpt.site');});
test('same-origin API preflight CORS is translated',async()=>{const r=await exercise({},new Response(null,{status:204,headers:{'access-control-allow-origin':'https://vayrox-ai.vs26bf9tsc.chatgpt.site'}}));assert.equal(r.headers['access-control-allow-origin'],'https://vayrox.example');});
