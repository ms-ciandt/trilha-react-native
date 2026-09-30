/**
 * Reads the manually-exported "Mapa de Conhecimento" chapter spreadsheet CSV
 * and produces an anonymized, aggregated JSON for the public /chapter page.
 *
 * The source spreadsheet is restricted to CI&T employees and, once mentees
 * respond, will contain individual names and per-person scores (columns H+).
 * This script only reads columns A-G, which the spreadsheet itself already
 * pre-aggregates (group average, group mastery %) — individual columns are
 * never read or written to the output.
 *
 * Output: src/data/chapter-knowledge-map.json
 *
 * Usage: node scripts/compute-chapter-data.mjs "/path/to/exported.csv"
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'src', 'data', 'chapter-knowledge-map.json');

const HEADER_ROW = 'Prioridade';
const MAX_COLUMN = 7; // columns A-G (0-indexed 0-6); column 7+ = individual mentee notes, never read

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/compute-chapter-data.mjs "/path/to/exported.csv"');
  process.exit(1);
}

// ─── Minimal quoted-CSV line parser ──────────────────────────────────────────
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(text) {
  // Handle fields with embedded newlines by scanning char-by-char for quote state,
  // then splitting into logical rows only on newlines outside quotes.
  const rows = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') inQuotes = !inQuotes;
    if ((char === '\n') && !inQuotes) {
      rows.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.length) rows.push(current);

  return rows.map(parseCsvLine);
}

// ─── Load and locate the header row ──────────────────────────────────────────
const raw = readFileSync(csvPath, 'utf8');
const rows = parseCsv(raw);

const headerIndex = rows.findIndex((row) => row[0]?.trim() === HEADER_ROW);
if (headerIndex === -1) {
  console.error(`Could not find header row starting with "${HEADER_ROW}". Is this the right CSV?`);
  process.exit(1);
}

const dataRows = rows.slice(headerIndex + 1);

function parseNumber(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace('%', '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const topics = dataRows
  .filter((row) => row[0]?.trim() && row[1]?.trim())
  .map((row) => {
    const [priorityRaw, topic, description, trailsRaw, avgScoreRaw, masteryRaw, criticalGapRaw] = row.slice(0, MAX_COLUMN);
    return {
      priority: parseNumber(priorityRaw) ?? 0,
      topic: topic.trim(),
      description: description?.trim() || '',
      trails: trailsRaw ? trailsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [],
      avgScore: parseNumber(avgScoreRaw),
      masteryPercent: parseNumber(masteryRaw) ?? 0,
      criticalGap: criticalGapRaw?.trim() || null,
    };
  })
  .sort((a, b) => b.priority - a.priority);

const output = {
  generatedAt: new Date().toISOString().slice(0, 10),
  topics,
};

writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n');

console.log(`Processed ${topics.length} topics.`);
console.log(`Output: src/data/chapter-knowledge-map.json`);
