/**
 * Reads all docs, computes reading time from word count, and looks up
 * video durations from video-durations.json (scraped by scrape-video-durations.mjs).
 *
 * Output: src/data/content-times.json
 *
 * Usage: node scripts/compute-times.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT       = join(__dirname, '..');
const DOCS_DIR   = join(ROOT, 'docs');
const DURATIONS  = join(ROOT, 'src', 'data', 'video-durations.json');
const OUT        = join(ROOT, 'src', 'data', 'content-times.json');

// Reading speed for technical content (words per minute)
const WPM = 200;

// ─── Load scraped video durations ────────────────────────────────────────────
const videoDurations = existsSync(DURATIONS)
  ? JSON.parse(readFileSync(DURATIONS, 'utf8'))
  : {};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countWords(markdown) {
  let text = markdown;
  // Remove fenced code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/~~~[\s\S]*?~~~/g, '');
  // Remove HTML tags (including multi-line video/source blocks)
  text = text.replace(/<[^>]+>/g, '');
  // Remove frontmatter
  text = text.replace(/^---[\s\S]*?---/m, '');
  // Remove markdown syntax characters (keep words)
  text = text.replace(/[#*_`[\]()>|~^]/g, ' ');
  // Count non-empty words
  return text.split(/\s+/).filter(w => w.length > 1).length;
}

function extractVideoFilename(markdown) {
  const match = markdown.match(
    /releases\/download\/v0-videos\/([^\s"']+\.mp4)/
  );
  return match ? match[1] : null;
}

function readMinutes(wordCount) {
  return Math.max(1, Math.round(wordCount / WPM));
}

// ─── Walk docs directory ──────────────────────────────────────────────────────

function walkDocs(dir, results = {}) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walkDocs(fullPath, results);
    } else if (extname(entry) === '.md' || extname(entry) === '.mdx') {
      // Skip internal CLAUDE.md and similar non-content files
      if (entry === 'CLAUDE.md' || entry.startsWith('COURSE-')) continue;

      const relPath = relative(DOCS_DIR, fullPath).replace(/\\/g, '/');
      const content = readFileSync(fullPath, 'utf8');

      const wordCount    = countWords(content);
      const readMin      = readMinutes(wordCount);
      const videoFile    = extractVideoFilename(content);
      const videoMin     = videoFile ? (videoDurations[videoFile] ?? null) : null;
      const hasVideo     = videoFile !== null;

      results[relPath] = { readMin, videoMin, hasVideo, videoFile };
    }
  }
  return results;
}

// ─── Aggregate by module and trail ───────────────────────────────────────────

function aggregateByPrefix(byDoc) {
  const byModule = {};
  const byTrail  = {};

  for (const [path, times] of Object.entries(byDoc)) {
    const parts  = path.split('/');
    const trail  = parts[0];
    const module = parts.length > 1 ? `${parts[0]}/${parts[1]}` : parts[0];

    for (const [key, store] of [[module, byModule], [trail, byTrail]]) {
      if (!store[key]) store[key] = { readMin: 0, videoMin: 0, docCount: 0 };
      store[key].readMin  += times.readMin;
      store[key].videoMin += times.videoMin ?? 0;
      store[key].docCount += 1;
    }
  }

  return { byModule, byTrail };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const byDoc = walkDocs(DOCS_DIR);
const { byModule, byTrail } = aggregateByPrefix(byDoc);

const total = {
  readMin:  Object.values(byDoc).reduce((s, d) => s + d.readMin, 0),
  videoMin: Object.values(byDoc).reduce((s, d) => s + (d.videoMin ?? 0), 0),
  docCount: Object.keys(byDoc).length,
};

const output = { byDoc, byModule, byTrail, total };
writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n');

console.log(`Processed ${total.docCount} docs.`);
console.log(`Total reading time: ${(total.readMin / 60).toFixed(1)} hours`);
console.log(`Total video time:   ${(total.videoMin / 60).toFixed(1)} hours`);
console.log(`Output: src/data/content-times.json`);
