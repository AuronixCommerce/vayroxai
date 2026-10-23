import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

test('Vercel build emits a runnable function and routes all application paths to it', async () => {
  execFileSync(process.execPath, ['scripts/build-vercel.mjs']);
  const output = JSON.parse(await readFile('.vercel/output/config.json', 'utf8'));
  const fn = JSON.parse(await readFile('.vercel/output/functions/gateway.func/.vc-config.json', 'utf8'));
  assert.equal(output.version, 3);
  const source = new RegExp('^' + output.routes[0].src + '$');
  for (const url of ['/', '/login', '/admin', '/api/chat', '/admin/api', '/assets/main.js']) {
    const match = source.exec(url);
    assert.ok(match, url);
    assert.equal(output.routes[0].dest.replace('$1', match[1]), '/gateway?__vayrox_path=' + url.slice(1));
  }
  assert.equal(fn.runtime, 'nodejs22.x');
  assert.equal(fn.supportsResponseStreaming, true);
  assert.equal(await readFile('.vercel/output/functions/gateway.func/' + fn.handler, 'utf8'), await readFile('api/gateway.mjs', 'utf8'));
});
