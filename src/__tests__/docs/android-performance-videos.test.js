import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../../..');

const VIDEOS = [
  { file: 'perf_01_thread.mp4',     slug: 'perf_01_thread' },
  { file: 'perf_02_flatlist.mp4',   slug: 'perf_02_flatlist' },
  { file: 'perf_03_reanimated.mp4', slug: 'perf_03_reanimated' },
  { file: 'perf_04_memo.mp4',       slug: 'perf_04_memo' },
  { file: 'perf_05_bundle.mp4',     slug: 'perf_05_bundle' },
];

const DOCS_EN = [
  '01-thread-model.md',
  '02-flatlist-optimisation.md',
  '03-reanimated.md',
  '04-memo-usememo-usecallback.md',
  '05-bundle-startup.md',
];

const DOCS_PT = DOCS_EN;

describe('Android Performance module videos', () => {
  describe('video files exist in static assets', () => {
    VIDEOS.forEach(({ file }) => {
      it(`static/assets/videos/trilha_android/${file}`, () => {
        const filePath = path.join(ROOT, 'static', 'assets', 'videos', 'trilha_android', file);
        expect(fs.existsSync(filePath), `Missing: ${filePath}`).toBe(true);
      });
    });
  });

  describe('EN docs contain video blocks (no "coming soon" label)', () => {
    DOCS_EN.forEach((doc, i) => {
      it(`docs/trilha-android/modulo-performance/${doc}`, () => {
        const filePath = path.join(ROOT, 'docs', 'trilha-android', 'modulo-performance', doc);
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toContain(`/trilha-react-native/assets/videos/trilha_android/${VIDEOS[i].slug}.mp4`);
        expect(content).not.toContain('coming soon');
      });
    });
  });

  describe('PT-BR docs contain video blocks (no "em breve" label)', () => {
    DOCS_PT.forEach((doc, i) => {
      it(`i18n/pt/.../trilha-android/modulo-performance/${doc}`, () => {
        const filePath = path.join(
          ROOT,
          'i18n', 'pt', 'docusaurus-plugin-content-docs', 'current',
          'trilha-android', 'modulo-performance', doc,
        );
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toContain(`/trilha-react-native/assets/videos/trilha_android/${VIDEOS[i].slug}.mp4`);
        expect(content).not.toContain('em breve');
      });
    });
  });
});
