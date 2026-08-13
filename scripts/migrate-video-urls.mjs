/**
 * Migrates all <source src> video URLs in docs from:
 *   /trilha-react-native/assets/videos/{subfolder}/{file}.mp4
 * to:
 *   https://github.com/ms-ciandt/trilha-react-native/releases/download/{tag}/{file}.mp4
 *
 * Usage:
 *   node scripts/migrate-video-urls.mjs [--tag v0-videos] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const tagIndex = args.indexOf('--tag');
const TAG = tagIndex !== -1 ? args[tagIndex + 1] : 'v0-videos';
const REPO = 'ms-ciandt/trilha-react-native';
const RELEASE_BASE = `https://github.com/${REPO}/releases/download/${TAG}`;

const STATIC_PREFIX = /\/trilha-react-native\/assets\/videos\/[^/]+\/([^"']+)/g;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      results.push(full);
    }
  }
  return results;
}

const files = [
  ...walk(path.join(ROOT, 'docs')),
  ...walk(path.join(ROOT, 'i18n')),
];

let totalFiles = 0;
let totalReplacements = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let count = 0;

  const updated = content.replace(STATIC_PREFIX, (match, filename) => {
    count++;
    return `${RELEASE_BASE}/${filename}`;
  });

  if (count > 0) {
    totalFiles++;
    totalReplacements += count;
    const rel = path.relative(ROOT, file);
    console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}${rel} — ${count} URL(s) migrada(s)`);
    if (!DRY_RUN) {
      fs.writeFileSync(file, updated, 'utf8');
    }
  }
}

console.log('');
console.log(`Tag        : ${TAG}`);
console.log(`Release    : ${RELEASE_BASE}`);
console.log(`Arquivos   : ${totalFiles}`);
console.log(`Substituições: ${totalReplacements}`);
if (DRY_RUN) console.log('(dry-run — nenhum arquivo foi alterado)');
