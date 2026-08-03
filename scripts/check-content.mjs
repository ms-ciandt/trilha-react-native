import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DOCS_DIR = path.join(ROOT, 'docs');
const PT_MIRROR_DIR = path.join(ROOT, 'i18n', 'pt', 'docusaurus-plugin-content-docs', 'current');
const STATIC_DIR = path.join(ROOT, 'static');
const SIDEBARS_FILE = path.join(ROOT, 'sidebars.js');

const errors = [];

function readDoc(file) {
  return fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
}

function walk(dir, exts = ['.md', '.mdx']) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, exts));
    } else if (entry.name !== 'CLAUDE.md' && exts.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

// ── 1. Every docs/**/*.md(x) must have a PT-BR mirror ────────────────────────
const enDocs = walk(DOCS_DIR);
for (const enFile of enDocs) {
  const rel = path.relative(DOCS_DIR, enFile);
  const ptFile = path.join(PT_MIRROR_DIR, rel);
  if (!fs.existsSync(ptFile)) {
    errors.push(`[missing-pt-mirror] ${rel}`);
  }
}

// ── 2. Every PT-BR mirror must have a matching EN source ─────────────────────
const ptDocs = walk(PT_MIRROR_DIR);
for (const ptFile of ptDocs) {
  const rel = path.relative(PT_MIRROR_DIR, ptFile);
  const enFile = path.join(DOCS_DIR, rel);
  if (!fs.existsSync(enFile)) {
    errors.push(`[orphan-pt-mirror] ${rel}`);
  }
}

// ── 3. Every <source src="..."> must resolve to a real static file ───────────
const allDocs = [...enDocs, ...ptDocs];
const srcPattern = /<source\s[^>]*src="([^"]+)"/g;
for (const file of allDocs) {
  const content = readDoc(file);
  let match;
  while ((match = srcPattern.exec(content)) !== null) {
    const src = match[1];
    // Skip absolute URLs — they can't be verified against static/
    if (src.startsWith('http://') || src.startsWith('https://')) continue;
    // Strip baseUrl prefix if present
    const normalized = src.replace(/^\/trilha-react-native\//, '/');
    const staticPath = path.join(STATIC_DIR, normalized);
    if (!fs.existsSync(staticPath)) {
      const rel = path.relative(ROOT, file);
      errors.push(`[broken-video-src] ${rel} → ${src}`);
    }
  }
}

// ── 4. Every .md(x) must have a `title:` in frontmatter ─────────────────────
const frontmatterPattern = /^(?:﻿)?---[\s\S]*?^---/m;
const titlePattern = /^title:/m;
for (const file of allDocs) {
  const content = readDoc(file);
  const fm = frontmatterPattern.exec(content);
  if (!fm || !titlePattern.test(fm[0])) {
    const rel = path.relative(ROOT, file);
    errors.push(`[missing-title] ${rel}`);
  }
}

// ── 5. Every sidebars.js item must resolve to a real file ───────────────────
// Build a set of all known doc IDs from the docs directory.
// Docusaurus uses: explicit `id:` frontmatter field, else the filename slug
// (filename without extension, numeric prefix stripped, e.g. "01-foo-bar" → "foo-bar").
const knownIds = new Set();
for (const file of enDocs) {
  const content = readDoc(file);
  const fm = frontmatterPattern.exec(content);
  const idMatch = fm && /^id:\s*(.+)$/m.exec(fm[0]);
  const folder = path.relative(DOCS_DIR, path.dirname(file)).replace(/\\/g, '/');

  if (idMatch) {
    knownIds.add(`${folder}/${idMatch[1].trim()}`);
  } else {
    // Strip leading numeric prefix (e.g. "01-foo-bar" → "foo-bar")
    const slug = path.basename(file, path.extname(file)).replace(/^\d+-/, '');
    knownIds.add(`${folder}/${slug}`);
  }
}

const sidebarContent = fs.readFileSync(SIDEBARS_FILE, 'utf8');
// Match quoted string items: 'some/path/slug' or "some/path/slug"
const itemPattern = /['"]([a-z0-9_-]+(?:\/[a-z0-9_-]+)+)['"]/g;
let sidebarMatch;
while ((sidebarMatch = itemPattern.exec(sidebarContent)) !== null) {
  const id = sidebarMatch[1];
  if (!knownIds.has(id)) {
    errors.push(`[broken-sidebar-item] ${id}`);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
if (errors.length === 0) {
  console.log('Content check passed — no issues found.');
  process.exit(0);
} else {
  console.error(`\nContent check failed — ${errors.length} issue(s) found:\n`);
  for (const e of errors) {
    console.error(`  ${e}`);
  }
  console.error('');
  process.exit(1);
}
