/**
 * Navigates every published course page and reads the <video> duration
 * from the browser's media API (no full download — only the MP4 header is fetched).
 *
 * Output: src/data/video-durations.json
 *   { "fund_01_javascript.mp4": 7.3, ... }  (values in minutes)
 *
 * Usage:
 *   node scripts/scrape-video-durations.mjs
 *   node scripts/scrape-video-durations.mjs --concurrency 3
 */

import { chromium } from '../mcp/notebook-downloader/node_modules/playwright/index.mjs';
import { createRequire } from 'module';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'src', 'data', 'video-durations.json');
const BASE_URL = 'https://ms-ciandt.github.io/trilha-react-native';

// ─── Parse args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const concurrencyArg = args.indexOf('--concurrency');
const CONCURRENCY = concurrencyArg !== -1 ? parseInt(args[concurrencyArg + 1], 10) : 5;

// ─── Load sidebars and flatten all doc IDs ───────────────────────────────────
const require = createRequire(import.meta.url);
const sidebars = require(path.join(ROOT, 'sidebars.js'));

function flattenItems(items) {
  const ids = [];
  for (const item of items) {
    if (typeof item === 'string') {
      ids.push(item);
    } else if (item.type === 'category') {
      ids.push(...flattenItems(item.items));
    }
  }
  return ids;
}

const allDocIds = Object.values(sidebars).flatMap(flattenItems);
console.log(`Found ${allDocIds.length} doc pages to scrape.`);

// ─── Load existing results to allow resuming ──────────────────────────────────
const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
let results = { ...existing };

// ─── Scrape a single page ─────────────────────────────────────────────────────
async function scrapePage(page, docId) {
  const url = `${BASE_URL}/${docId}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Check if a <video> element exists on the page
    const videoEl = await page.$('video source[src*="v0-videos"]');
    if (!videoEl) return null;

    // Get the video filename from the source src attribute
    const src = await videoEl.getAttribute('src');
    const filename = src.split('/').pop();

    // Wait for the video metadata to load (browser fetches only the MP4 header)
    const durationSeconds = await page.evaluate(async () => {
      const video = document.querySelector('video');
      if (!video) return null;

      // If metadata already loaded
      if (video.readyState >= 1 && isFinite(video.duration)) {
        return video.duration;
      }

      // Wait for loadedmetadata event
      return new Promise((resolve) => {
        const onMeta = () => resolve(video.duration);
        const onErr  = () => resolve(null);
        video.addEventListener('loadedmetadata', onMeta, { once: true });
        video.addEventListener('error', onErr, { once: true });
        // Trigger load
        video.load();
        // Timeout after 20s
        setTimeout(() => resolve(null), 20_000);
      });
    });

    if (!durationSeconds || !isFinite(durationSeconds)) {
      console.log(`  [no duration] ${docId} → ${filename}`);
      return { filename, minutes: null };
    }

    const minutes = Math.round((durationSeconds / 60) * 10) / 10; // 1 decimal
    console.log(`  [ok] ${docId} → ${filename} = ${minutes} min`);
    return { filename, minutes };
  } catch (err) {
    console.error(`  [error] ${docId}: ${err.message}`);
    return null;
  }
}

// ─── Run with concurrency limit ───────────────────────────────────────────────
async function runBatch(browser, batch) {
  const pages = await Promise.all(
    batch.map(() => browser.newPage())
  );
  const batchResults = await Promise.all(
    batch.map((docId, i) => scrapePage(pages[i], docId))
  );
  await Promise.all(pages.map(p => p.close()));
  return batchResults;
}

async function main() {
  // Filter out docs already scraped (with a real duration value)
  const toScrape = allDocIds.filter(id => {
    // We can't easily map docId → filename before scraping, so scrape all
    // already-scraped ones will just update in place
    return true;
  });

  const browser = await chromium.launch({ headless: true });
  console.log(`\nScraping ${toScrape.length} pages (concurrency=${CONCURRENCY})...\n`);

  let scraped = 0;
  let withVideo = 0;

  for (let i = 0; i < toScrape.length; i += CONCURRENCY) {
    const batch = toScrape.slice(i, i + CONCURRENCY);
    const batchRes = await runBatch(browser, batch);

    for (const res of batchRes) {
      if (res && res.filename && res.minutes !== null) {
        results[res.filename] = res.minutes;
        withVideo++;
      }
    }
    scraped += batch.length;

    // Save after each batch so progress is not lost on interruption
    writeFileSync(OUT, JSON.stringify(results, null, 2) + '\n');
    console.log(`Progress: ${scraped}/${toScrape.length} pages scraped, ${withVideo} videos found.\n`);
  }

  await browser.close();

  console.log(`\nDone. ${Object.keys(results).length} video durations saved to src/data/video-durations.json`);
  console.log(`Total video time: ${(Object.values(results).reduce((a, b) => a + b, 0) / 60).toFixed(1)} hours`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
