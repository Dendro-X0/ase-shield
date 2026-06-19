#!/usr/bin/env node
/**
 * Zip extension dist/ for Chrome Web Store / Edge Add-ons upload.
 * Usage: node scripts/package-extension.mjs
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'apps/extension/dist');

function readVersionFromManifest() {
  const manifestPath = path.join(distDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing ${manifestPath}. Run pnpm build first.`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!manifest.version) {
    throw new Error('manifest.json has no version field');
  }
  return manifest.version;
}

function createZip(zipPath, sourceDir) {
  if (existsSync(zipPath)) {
    unlinkSync(zipPath);
  }

  if (process.platform === 'win32') {
    const script = `$src = ${JSON.stringify(sourceDir)}; $dst = ${JSON.stringify(zipPath)}; Compress-Archive -Path (Join-Path $src '*') -DestinationPath $dst -Force`;
    const result = spawnSync('powershell', ['-NoProfile', '-Command', script], { stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error('Compress-Archive failed');
    }
    return;
  }

  execSync(`cd ${JSON.stringify(sourceDir)} && zip -r ${JSON.stringify(zipPath)} .`, {
    stdio: 'inherit',
    shell: true,
  });
}

async function main() {
  if (!existsSync(distDir)) {
    throw new Error(`Extension dist not found at ${distDir}. Run: pnpm build`);
  }

  const version = readVersionFromManifest();
  const outDir = path.join(root, 'dist/release');
  await mkdir(outDir, { recursive: true });

  const zipName = `anti-se-shield-extension-${version}.zip`;
  const zipPath = path.join(outDir, zipName);

  createZip(zipPath, distDir);

  const { size } = await stat(zipPath);
  console.log(`Created ${zipPath} (${(size / 1024).toFixed(1)} KB)`);
  console.log('Upload to Chrome Web Store Developer Dashboard or Edge Partner Center.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
