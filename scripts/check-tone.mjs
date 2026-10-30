// Heuristic keyword scan for hostile/condescending narration in .vtt caption files.
// This is a first-pass flagging tool, not a verdict: every match must still be read
// in context by a human or an LLM to separate real hostility from neutral technical
// jargon (e.g. "primitive types", "legacy bridge", "engineering nightmare" describing
// a coordination problem rather than the student). See docs/introducao/CLAUDE.md and
// TONE_AUDIT_REPORT.md for the criteria this mirrors.
//
// Usage:
//   node scripts/check-tone.mjs <file-or-dir> [<file-or-dir> ...]
//   node scripts/check-tone.mjs static/assets/captions/introducao
//
// Exit code is always 0 — this tool surfaces candidates, it does not fail builds.

import fs from 'fs';
import path from 'path';

const KEYWORDS = {
  'waste-of-time': [
    'waste of time', 'wasting time', 'poor use of time', 'not worth your time',
    'perda de tempo', 'perdendo tempo', 'mau uso do tempo',
  ],
  'severity-pain': [
    'severe', 'brutal', 'punish', 'harsh', 'nightmare', 'suffer',
    'severo', 'severa', 'brutal', 'punir', 'punição', 'pesadelo', 'sofrer',
  ],
  'pride-shame-humility': [
    'swallow your pride', 'humility', 'humbling', 'your ego', 'stroking your own ego', 'shame', 'ashamed',
    'engolir seu orgulho', 'humildade', 'seu ego', 'vergonha', 'envergonhado',
  ],
  'disparaging-comparative': [
    'primitive', 'outdated', 'inferior', 'stupid', 'incompetent', 'hack ', 'amateur',
    'primitivo', 'obsoleto', 'inferior', 'idiota', 'incompetente', 'gambiarra', 'amador',
  ],
  'dismissiveness': [
    'obviously', 'trivially', 'any competent developer', 'hit a wall immediately',
    'obviamente', 'trivialmente', 'qualquer desenvolvedor competente',
  ],
  'attack-framing': [
    'targeted attack on', 'will punish you', 'zero handholding',
    'ataque direcionado', 'vai te punir',
  ],
  'mockery': [
    'annoying', 'ugly', 'clunky', 'condescend', 'mock ', 'mocking',
    'chato', 'péssimo', 'zombar', 'zombaria',
  ],
};

const ALL_PATTERNS = Object.entries(KEYWORDS).flatMap(([category, words]) =>
  words.map((w) => ({ category, word: w, re: new RegExp(w.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }))
);

function parseVtt(content) {
  const blocks = content.split(/\r?\n\r?\n/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).filter(Boolean);
    const tsLine = lines.find((l) => l.includes('-->'));
    if (!tsLine) continue;
    const text = lines.filter((l) => l !== tsLine && !/^\d+$/.test(l)).join(' ');
    const start = tsLine.split('-->')[0].trim();
    cues.push({ start, text });
  }
  return cues;
}

function scanFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const cues = parseVtt(content);
  const hits = [];
  for (const cue of cues) {
    for (const { category, word, re } of ALL_PATTERNS) {
      if (re.test(cue.text)) {
        hits.push({ file, timestamp: cue.start, category, word: word.trim(), text: cue.text });
      }
    }
  }
  return hits;
}

function collectFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    const stat = fs.statSync(input);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(input, { withFileTypes: true })) {
        const full = path.join(input, entry.name);
        if (entry.isDirectory()) files.push(...collectFiles([full]));
        else if (entry.name.endsWith('.vtt')) files.push(full);
      }
    } else if (input.endsWith('.vtt')) {
      files.push(input);
    }
  }
  return files;
}

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  console.error('Usage: node scripts/check-tone.mjs <file-or-dir> [<file-or-dir> ...]');
  process.exit(1);
}

const files = collectFiles(inputs);
let totalHits = 0;

for (const file of files) {
  const hits = scanFile(file);
  if (hits.length === 0) continue;
  totalHits += hits.length;
  console.log(`\n${file}`);
  for (const hit of hits) {
    console.log(`  [${hit.timestamp}] (${hit.category}: "${hit.word}") ${hit.text}`);
  }
}

if (totalHits === 0) {
  console.log('No candidate phrases found in any scanned file.');
} else {
  console.log(`\n${totalHits} candidate phrase(s) found across ${files.length} file(s) scanned.`);
  console.log('Each candidate must still be read in context — many are neutral technical usage (e.g. "primitive types", "legacy bridge" as history). See docs/introducao/CLAUDE.md and TONE_AUDIT_REPORT.md for the judgment criteria.');
}

process.exit(0);
