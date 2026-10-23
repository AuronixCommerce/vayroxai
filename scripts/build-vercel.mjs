import { mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.vercel/output');
await rm(output, { recursive: true, force: true });
const functionDir = path.join(output, 'functions/gateway.func');
await mkdir(functionDir, { recursive: true });
await mkdir(path.join(output, 'static'), { recursive: true });
await copyFile(path.join(root, 'api/gateway.mjs'), path.join(functionDir, 'index.mjs'));
await writeFile(path.join(functionDir, '.vc-config.json'), JSON.stringify({
  runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs',
  maxDuration: 300, supportsResponseStreaming: true,
}, null, 2));
await writeFile(path.join(output, 'config.json'), JSON.stringify({
  version: 3,
  routes: [{ src: '/(.*)', dest: '/gateway?__vayrox_path=$1' }],
}, null, 2));
console.log('Built Vayrox AI gateway function and catch-all route using Build Output API v3.');
