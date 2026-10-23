import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('vercel-public',{recursive:true});
await writeFile('vercel-public/.keep','');
console.log('Vayrox AI gateway prepared. Application data remains in the protected Sites backend.');
