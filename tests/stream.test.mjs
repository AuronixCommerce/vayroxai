import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groqText } from '../lib/stream.ts';
function body(parts){const encoder=new TextEncoder();return new ReadableStream({start(c){for(const part of parts)c.enqueue(typeof part==='string'?encoder.encode(part):part);c.close();}});}
async function text(stream){let value='';for await(const part of groqText(stream))value+=part;return value;}
test('streams text across fragmented SSE events and ignores metadata',async()=>{
 assert.equal(await text(body(['data: {"choices":[{"delta":{"role":"assistant"}}]}\n\nda','ta: {"choices":[{"delta":{"content":"Hello "}}]}\n','\ndata: {"choices":[{"delta":{"content":"world"}}]}\n\ndata: [DONE]\n\n'])),'Hello world');
});
test('preserves multibyte Urdu text across byte boundaries',async()=>{
 const bytes=new TextEncoder().encode('data: {"choices":[{"delta":{"content":"سلام"}}]}\r\n\r\ndata: [DONE]\r\n\r\n');
 assert.equal(await text(body(Array.from(bytes,b=>new Uint8Array([b])))),'سلام');
});
test('handles a final event without a trailing newline',async()=>{
 assert.equal(await text(body(['data: {"choices":[{"delta":{"content":"OK"}}]}\n\ndata: [DONE]'])),'OK');
});
test('reports provider errors and prematurely ended streams',async()=>{
 await assert.rejects(()=>text(body(['data: {"error":{"message":"sensitive provider detail"}}\n\n'])),/provider interrupted/);
 await assert.rejects(()=>text(body(['data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'])),/before the response finished/);
});
test('reports output limits and malformed events',async()=>{
 await assert.rejects(()=>text(body(['data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n'])),/length limit/);
 await assert.rejects(()=>text(body(['data: invalid-json\n\n'])),/unreadable response/);
});
