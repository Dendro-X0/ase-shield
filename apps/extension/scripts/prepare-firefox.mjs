import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chromeDist = join(root, 'dist');
const firefoxDist = join(root, 'dist-firefox');

if (!existsSync(chromeDist)) {
  console.error('Run vite build first — dist/ not found.');
  process.exit(1);
}

cpSync(chromeDist, firefoxDist, { recursive: true, force: true });

const manifestPath = join(firefoxDist, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

manifest.browser_specific_settings = {
  gecko: {
    id: 'anti-se-shield@local.dev',
    strict_min_version: '109.0',
  },
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Firefox package ready at apps/extension/dist-firefox');
