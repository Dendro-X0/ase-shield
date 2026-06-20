#!/usr/bin/env node
/**
 * Verify CI/release artifacts and write SHA256SUMS.txt.
 * Usage: node scripts/stage-release-assets.mjs <extension-zip-dir> <companion-exe-dir> <output-dir>
 */
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const [extensionDir, companionDir, outputDir] = process.argv.slice(2);

if (!extensionDir || !companionDir || !outputDir) {
  console.error(
    'Usage: node scripts/stage-release-assets.mjs <extension-zip-dir> <companion-exe-dir> <output-dir>',
  );
  process.exit(1);
}

function pickFiles(dir, matcher) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(matcher)
    .map((name) => path.join(dir, name));
}

const extensionZips = pickFiles(extensionDir, (name) => name.endsWith('.zip'));
const companionExes = pickFiles(companionDir, (name) => name.endsWith('.exe'));

if (extensionZips.length === 0) {
  console.error(`No extension zip found in ${extensionDir}`);
  process.exit(1);
}

if (companionExes.length === 0) {
  console.error(`No companion installer found in ${companionDir}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const staged = [...extensionZips, ...companionExes].map((source) => {
  const target = path.join(outputDir, path.basename(source));
  copyFileSync(source, target);
  return target;
});

const lines = staged.map((filePath) => {
  const hash = createHash('sha256').update(readFileSync(filePath)).digest('hex');
  return `${hash}  ${path.basename(filePath)}`;
});

writeFileSync(path.join(outputDir, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`, 'utf8');

console.log('Staged release assets:');
for (const filePath of staged) {
  console.log(`  ${path.basename(filePath)}`);
}
console.log('  SHA256SUMS.txt');
console.log(`Output: ${outputDir}`);
