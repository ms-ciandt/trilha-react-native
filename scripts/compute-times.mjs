import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const docsDir = join(root, 'docs');
const outputPath = join(root, 'src', 'data', 'content-times.json');
const durationsPath = join(root, 'src', 'data', 'video-durations.json');

const VIDEO_DURATIONS = JSON.parse(readFileSync(durationsPath, 'utf8'));
const DEFAULT_VIDEO_MIN = 7;

function walkFiles(dir, exts) {
  const result = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      result.push(...walkFiles(full, exts));
    } else if (exts.includes(extname(entry))) {
      result.push(full);
    }
  }
  return result;
}

function countWords(content) {
  let text = content.replace(/^---[\s\S]*?---\n/, '');
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/!\[.*?\]\(.*?\)/g, '');
  text = text.replace(/\[.*?\]\(.*?\)/g, '');
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function findVideoFilename(content) {
  const match = content.match(/v0-videos\/([^"'\s>]+\.mp4)/);
  return match ? match[1] : null;
}

const byDoc = {};
const byModule = {};
const byTrail = {};
let totalRead = 0;
let totalVideo = 0;

const files = walkFiles(docsDir, ['.md', '.mdx']);

for (const file of files) {
  if (basename(file) === 'CLAUDE.md') continue;

  const content = readFileSync(file, 'utf8');
  const relPath = relative(docsDir, file).replace(/\\/g, '/');
  const docId = relPath.replace(/\.(md|mdx)$/, '');

  const segments = docId.split('/');
  const trail = segments[0];
  const moduleKey = segments.length >= 2 ? `${segments[0]}/${segments[1]}` : segments[0];

  const wordCount = countWords(content);
  const readMin = Math.max(1, Math.round(wordCount / 200));

  const videoFilename = findVideoFilename(content);
  const hasVideo = videoFilename !== null;
  const videoMin = hasVideo ? (VIDEO_DURATIONS[videoFilename] ?? DEFAULT_VIDEO_MIN) : 0;

  byDoc[docId] = { readMin, videoMin, hasVideo };

  if (!byModule[moduleKey]) byModule[moduleKey] = { readMin: 0, videoMin: 0, docCount: 0 };
  byModule[moduleKey].readMin += readMin;
  byModule[moduleKey].videoMin += videoMin;
  byModule[moduleKey].docCount++;

  if (!byTrail[trail]) byTrail[trail] = { readMin: 0, videoMin: 0 };
  byTrail[trail].readMin += readMin;
  byTrail[trail].videoMin += videoMin;

  totalRead += readMin;
  totalVideo += videoMin;
}

const output = { byDoc, byModule, byTrail, total: { readMin: totalRead, videoMin: totalVideo } };
writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(
  `Generated content-times.json — ${Object.keys(byDoc).length} docs, ` +
  `${totalRead} read min (~${Math.round(totalRead / 60)} h), ` +
  `${totalVideo} video min (~${Math.round(totalVideo / 60)} h)`
);
