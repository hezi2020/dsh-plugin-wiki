import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const patch = await readFile(resolve(root, 'cordis.patch.yml'), 'utf8');
const files = ['vision.js', 'image.js', 'video.js', 'lib/shared.mjs', 'lib/vision-core.mjs', 'lib/image-core.mjs', 'lib/video-core.mjs', 'README.md'];
const errors = [];

if (pkg.dsh?.bundle?.patch !== './cordis.patch.yml') errors.push('package.json missing dsh.bundle.patch');
for (const id of ['dsh-xiapan-vision', 'dsh-xiapan-image', 'dsh-xiapan-video']) if (!patch.includes(`id: ${id}`)) errors.push(`bundle missing ${id}`);
for (const file of files) {
  const content = await readFile(resolve(root, file), 'utf8');
  if (/\bsk-[A-Za-z0-9_-]{16,}\b/.test(content)) errors.push(`${file} appears to contain a hard-coded API key`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('check: package, bundle, entrypoints, and secret scan passed');
