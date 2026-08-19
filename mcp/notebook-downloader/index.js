import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

// Executable paths per browser per OS.
// Chromium-based browsers (Edge, Chrome, Brave) all use the same CDP protocol,
// so the automation logic is identical — only the executable path differs.
// Each browser gets an isolated profile so sessions don't interfere with each
// other or with the user's real browser profile. Profiles are created on first
// run; the user logs in once and the session is reused across invocations.
const EXECUTABLES = {
  edge: {
    win32:  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    darwin: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    linux:  '/usr/bin/microsoft-edge',
  },
  chrome: {
    win32:  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    linux:  '/usr/bin/google-chrome',
  },
  brave: {
    win32:  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    darwin: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    linux:  '/usr/bin/brave-browser',
  },
};

function getExecutablePath(browser) {
  const paths = EXECUTABLES[browser];
  if (!paths) {
    throw new Error(`Unknown browser "${browser}". Valid options: ${Object.keys(EXECUTABLES).join(', ')}`);
  }
  return paths[process.platform] ?? paths.linux;
}

// ─── shared auth helper ───────────────────────────────────────────────────────

async function openNotebook(context, url, debugDir) {
  const page = await context.newPage();

  // NotebookLM keeps long-polling connections open — networkidle never fires.
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // If the session is missing or expired, Google redirects to accounts.google.com.
  if (page.url().includes('accounts.google.com')) {
    const isGoogleAuth = (href) =>
      href.includes('accounts.google.com') || href === 'about:blank' || href === '';

    // Keep any popup pages alive (account chooser, etc.)
    context.on('page', () => {});

    // Poll every 2s for up to 3 minutes until the main page leaves Google auth.
    let loggedIn = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      await page.waitForTimeout(2000);
      try {
        if (!isGoogleAuth(page.url())) { loggedIn = true; break; }
      } catch { /* mid-navigation */ }
    }

    if (!loggedIn) throw new Error('Google login timed out after 3 minutes. Please try again.');

    // After login, NotebookLM sometimes redirects to the home page — retry navigation.
    const notebookPath = new URL(url).pathname;
    let landed = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2000);
      if (page.url().includes(notebookPath)) { landed = true; break; }
    }
    if (!landed) {
      if (debugDir) await page.screenshot({ path: path.join(debugDir, '_debug_auth.png') });
      throw new Error(
        `NotebookLM redirected to ${page.url()} instead of the requested notebook. ` +
        `Check _debug_auth.png for the current page state.`
      );
    }
  }

  await page.waitForSelector('body', { timeout: 10000 });
  await page.waitForTimeout(4000);
  return page;
}

// ─── quiz scraper helpers ─────────────────────────────────────────────────────

async function openQuizArtifact(page, debugDir) {
  // NotebookLM renders quiz artifacts as clickable items in the Studio panel.
  // We try several selector strategies in order, most-specific first.
  const quizSelectors = [
    'artifact-view-item:has-text("Quiz")',
    'artifact-view-item:has-text("quiz")',
    '[class*="artifact"]:has-text("Quiz")',
    '[class*="studio"]:has-text("Quiz")',
    'button:has-text("Quiz")',
    'mat-card:has-text("Quiz")',
  ];

  let clicked = false;
  for (const sel of quizSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click();
        clicked = true;
        break;
      }
    } catch { /* selector not matched */ }
  }

  if (!clicked) {
    if (debugDir) await page.screenshot({ path: path.join(debugDir, '_debug_studio.png') });
    throw new Error(
      'Could not find the Quiz artifact in the Studio panel. ' +
      'Check _debug_studio.png for the current page state and report the selector needed.'
    );
  }

  // Wait for the quiz question UI to appear
  await page.waitForSelector('multiple-choice-question', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function scrapeAllQuestions(page) {
  // Rewind to question 1 by clicking Previous until disabled
  for (let i = 0; i < 50; i++) {
    const backBtn = await page.$('button.back-btn');
    if (!backBtn) break;
    const disabled = await backBtn.isDisabled();
    if (disabled) break;
    await backBtn.click();
    await page.waitForTimeout(500);
  }

  // Get total from counter text "1 / 7" → 7
  const counterText = await page.$eval(
    'div.question-context span',
    el => el.textContent.trim()
  );
  const total = parseInt(counterText.split('/')[1]?.trim() ?? '1', 10);

  const questions = [];

  for (let i = 0; i < total; i++) {
    const question = await page.$eval('h1.question-text', el => el.textContent.trim());

    // Click option A if not yet answered — this reveals correct/incorrect on all buttons
    const alreadyAnswered = await page.$('button.answer-btn.answered');
    if (!alreadyAnswered) {
      const firstBtn = await page.$('button.answer-btn');
      if (firstBtn) {
        await firstBtn.click();
        await page.waitForSelector('button.answer-btn.answered', { timeout: 5000 });
      }
    }

    // Collect text + per-option rationale from each answer button
    const options = await page.$$eval('button.answer-btn', btns =>
      btns.map(btn => ({
        text: btn.querySelector('div.answer-text')?.textContent?.trim() ?? '',
        rationale: btn.querySelector('div.rationale')?.textContent?.trim() ?? '',
      }))
    );

    // The button with class "correct" is the right answer regardless of what was clicked
    const correctIndex = await page.$$eval(
      'button.answer-btn',
      btns => btns.findIndex(b => b.classList.contains('correct'))
    );

    questions.push({ question, options, correctIndex });

    if (i < total - 1) {
      const nextBtn = await page.$('button.next-btn');
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(800);
      }
    }
  }

  return questions;
}

function buildMdx(title, docId, questions, lang) {
  const intro = lang === 'en'
    ? `Test your knowledge of this module's topics.`
    : `Teste seus conhecimentos sobre os tópicos deste módulo.`;

  const questionsJson = JSON.stringify(questions, null, 2)
    .split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');

  return `---
id: ${docId}
title: ${title}
---

import Quiz from '@site/src/components/Quiz';

# ${title}

${intro}

<Quiz questions={${questionsJson}} lang="${lang}" />
`;
}

// ─── server ───────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'notebook-downloader', version: '1.2.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'download_notebook_videos',
      description:
        'Downloads all audio/video files from a Google NotebookLM notebook. ' +
        'The chosen browser must be fully closed before running. ' +
        'Supports Edge, Chrome and Brave on Windows, macOS and Linux. ' +
        'After a successful download, automatically invoke the /integrar-videos skill ' +
        'passing the output_dir so the files are renamed, moved to the correct assets ' +
        'folder, and embedded in the EN and PT-BR docs.',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'Full URL of the NotebookLM notebook (e.g. https://notebooklm.google.com/notebook/...)',
          },
          output_dir: {
            type: 'string',
            description: 'Absolute path to the folder where videos will be saved',
          },
          browser: {
            type: 'string',
            enum: ['edge', 'chrome', 'brave'],
            description: 'Browser to use for automation. Defaults to "edge".',
          },
        },
        required: ['url', 'output_dir'],
      },
    },
    {
      name: 'extract_notebook_quiz',
      description:
        'Extracts quiz questions from a Google NotebookLM notebook quiz artifact ' +
        'and generates EN and PT-BR .mdx files with an interactive Quiz component ' +
        'ready to use in Docusaurus. The browser must be fully closed before running.',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'Full URL of the NotebookLM notebook',
          },
          output_en: {
            type: 'string',
            description: 'Absolute path for the EN .mdx output file',
          },
          output_pt: {
            type: 'string',
            description: 'Absolute path for the PT-BR .mdx mirror file',
          },
          title_en: {
            type: 'string',
            description: 'Quiz page title in English (default: "Quiz")',
          },
          title_pt: {
            type: 'string',
            description: 'Quiz page title in Portuguese (default: "Quiz")',
          },
          doc_id: {
            type: 'string',
            description: 'Docusaurus doc id in frontmatter (default: "quiz")',
          },
          browser: {
            type: 'string',
            enum: ['edge', 'chrome', 'brave'],
            description: 'Browser to use for automation. Defaults to "edge".',
          },
        },
        required: ['url', 'output_en', 'output_pt'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // ── extract_notebook_quiz ──────────────────────────────────────────────────
  if (name === 'extract_notebook_quiz') {
    const {
      url,
      output_en,
      output_pt,
      title_en = 'Quiz',
      title_pt = 'Quiz',
      doc_id = 'quiz',
      browser = 'edge',
    } = args;

    const executablePath = getExecutablePath(browser);
    const automationProfile = path.join(SCRIPT_DIR, `${browser}-automation-profile`);
    const debugDir = path.dirname(output_en);

    const singletonLock = path.join(automationProfile, 'SingletonLock');
    if (fs.existsSync(singletonLock)) {
      try { fs.unlinkSync(singletonLock); } catch { /* ignore */ }
    }

    const context = await chromium.launchPersistentContext(automationProfile, {
      executablePath,
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    try {
      const page = await openNotebook(context, url, debugDir);
      await page.screenshot({ path: path.join(debugDir, '_debug_notebook.png') });
      await openQuizArtifact(page, debugDir);
      const questions = await scrapeAllQuestions(page);

      if (questions.length === 0) {
        throw new Error('No questions collected. Check _debug_notebook.png for the current page state.');
      }

      fs.mkdirSync(path.dirname(output_en), { recursive: true });
      fs.writeFileSync(output_en, buildMdx(title_en, doc_id, questions, 'en'), 'utf8');

      fs.mkdirSync(path.dirname(output_pt), { recursive: true });
      fs.writeFileSync(output_pt, buildMdx(title_pt, doc_id, questions, 'pt'), 'utf8');

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            questions_collected: questions.length,
            output_en,
            output_pt,
            next_step: 'Run npm start to verify the quiz renders correctly.',
          }, null, 2),
        }],
      };
    } finally {
      await context.close();
    }
  }

  // ── download_notebook_videos ───────────────────────────────────────────────
  if (name === 'download_notebook_videos') {
    const { url, output_dir, browser = 'edge' } = args;

    const executablePath = getExecutablePath(browser);
    const automationProfile = path.join(SCRIPT_DIR, `${browser}-automation-profile`);

    // Remove any stale lock left by a previous crash. Without this, Chrome refuses
    // to start with "Profile is already in use" and the session appears lost.
    const singletonLock = path.join(automationProfile, 'SingletonLock');
    if (fs.existsSync(singletonLock)) {
      try { fs.unlinkSync(singletonLock); } catch { /* ignore — Chrome recreates it on launch */ }
    }

    if (!fs.existsSync(output_dir)) {
      fs.mkdirSync(output_dir, { recursive: true });
    }

    // Snapshot of files already in output_dir — used to skip duplicates.
    const existingFiles = new Set(
      fs.readdirSync(output_dir).map(f => f.toLowerCase())
    );

    const context = await chromium.launchPersistentContext(automationProfile, {
      executablePath,
      headless: false,
      acceptDownloads: true,
      downloadsPath: output_dir,
      args: [
        // Prevents Google from detecting Playwright's automation hook, which causes
        // it to refuse to save the session or invalidate it on every run.
        '--disable-blink-features=AutomationControlled',
        // Suppress Chrome's first-run wizard and default-browser prompt, which
        // block automation on a machine that has never opened this profile before.
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    const downloaded = [];
    const skipped = [];
    const errors = [];

    try {
      const page = await openNotebook(context, url, output_dir);

      // Take a debug screenshot so we can see the current state
      await page.screenshot({ path: path.join(output_dir, '_debug_screenshot.png') });

      // Each Studio item's "⋮" button carries the class "artifact-more-button" —
      // confirmed from the page HTML. This class does not appear on Sources panel
      // buttons, so no positional filtering or panel-container detection is needed.
      const moreMenuSelectors = [
        'button.artifact-more-button',           // exact NotebookLM Studio class
        'button[aria-label="More"].mat-mdc-menu-trigger', // slightly broader fallback
        'button[aria-label="More"]',             // aria-only fallback
      ];

      let moreButtons = [];
      for (const sel of moreMenuSelectors) {
        const found = await page.$$(sel);
        if (found.length > 0) {
          moreButtons = found;
          break;
        }
      }

      if (moreButtons.length === 0) {
        throw new Error(
          'Could not find the "more options" (⋮) buttons on the notebook page. ' +
          'Check _debug_screenshot.png in the output folder for the current page state.'
        );
      }

      for (let i = 0; i < moreButtons.length; i++) {
        try {
          // Open the kebab menu for this audio item
          await moreButtons[i].click();
          await page.waitForTimeout(800);

          // Look for a "Download" option in the menu that just appeared
          const downloadOption = await page.$(
            '[role="menuitem"]:has-text("Download"), ' +
            '[role="option"]:has-text("Download"), ' +
            'button:has-text("Download"), ' +
            'a:has-text("Download")'
          );

          if (!downloadOption) {
            // This kebab menu doesn't have Download — close it and move on
            await page.keyboard.press('Escape');
            await page.waitForTimeout(400);
            continue;
          }

          const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
          await downloadOption.click();
          const dl = await downloadPromise;
          const suggestedName = dl.suggestedFilename() || `audio_${i + 1}.wav`;

          if (existingFiles.has(suggestedName.toLowerCase())) {
            // Already on disk — discard the download and move on.
            try { await dl.delete(); } catch { /* ignore */ }
            skipped.push(suggestedName);
          } else {
            const savePath = path.join(output_dir, suggestedName);
            await dl.saveAs(savePath);
            downloaded.push(savePath);
            existingFiles.add(suggestedName.toLowerCase());
          }

          await page.waitForTimeout(1500);
        } catch (err) {
          errors.push(`Item ${i + 1}: ${err.message}`);
          try { await page.keyboard.press('Escape'); } catch { /* ignore */ }
          await page.waitForTimeout(400);
        }
      }

      if (downloaded.length === 0 && skipped.length === 0) {
        throw new Error(
          'No files were downloaded. The "more options" buttons were found but none had a Download item. ' +
          'Check _debug_screenshot.png — the audio overviews may still be generating.'
        );
      }
    } finally {
      await context.close();
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          browser,
          downloaded_count: downloaded.length,
          skipped_count: skipped.length,
          files: downloaded,
          skipped: skipped.length > 0 ? skipped : undefined,
          errors: errors.length > 0 ? errors : undefined,
          next_step: downloaded.length > 0
            ? `Run /integrar-videos ${output_dir} to rename the files, copy them to the correct assets folder, and embed them in the EN and PT-BR docs.`
            : undefined,
        }, null, 2),
      }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
