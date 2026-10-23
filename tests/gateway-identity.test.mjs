import test from 'node:test';
import assert from 'node:assert/strict';
import { gatewaySignature, gatewayVisitorIp } from '../lib/gateway-identity.ts';
test('only fresh signed visitor identities override Cloudflare IP', async () => {
  const time = String(Date.now()), secret = 'test-secret', ip = '203.0.113.8';
  const signature = await gatewaySignature(secret, 'POST', '/api/chat?q=1', ip, time);
  const headers = {'cf-connecting-ip':'192.0.2.1','x-vayrox-visitor-ip':ip,'x-vayrox-timestamp':time,'x-vayrox-signature':signature};
  const req = () => new Request('https://app.example/api/chat?q=1',{method:'POST',headers});
  assert.equal(await gatewayVisitorIp(req(), secret), ip);
  assert.equal(await gatewayVisitorIp(req(), secret, Number(time)+61000), '192.0.2.1');
  assert.equal(await gatewayVisitorIp(req(), 'wrong-secret'), '192.0.2.1');
  headers['x-vayrox-visitor-ip']='203.0.113.9';
  assert.equal(await gatewayVisitorIp(req(), secret), '192.0.2.1');
});
