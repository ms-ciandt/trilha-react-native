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

const server = new Server(
  { name: 'notebook-downloader', version: '1.1.0' },
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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'download_notebook_videos') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { url, output_dir, browser = 'edge' } = request.params.arguments;

  const executablePath = getExecutablePath(browser);
  // Each browser gets its own isolated profile so sessions don't interfere.
  const automationProfile = path.join(SCRIPT_DIR, `${browser}-automation-profile`);

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
  });

  const downloaded = [];
  const skipped = [];
  const errors = [];

  try {
    const page = await context.newPage();

    // NotebookLM keeps long-polling connections open — networkidle never fires.
    // Use domcontentloaded + explicit wait for a known element instead.
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // If the session is missing or expired, Google redirects to accounts.google.com.
    // Wait up to 2 minutes for the user to complete login, then navigate back.
    if (page.url().includes('accounts.google.com')) {
      await page.waitForURL(u => !u.toString().includes('accounts.google.com'), { timeout: 120000 });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    // Wait for the notebook Studio panel (where audio overviews live)
    await page.waitForSelector('body', { timeout: 10000 });
    await page.waitForTimeout(4000);

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
          // Register so a duplicate entry in the same session is also skipped.
          existingFiles.add(suggestedName.toLowerCase());
        }

        await page.waitForTimeout(1500);
      } catch (err) {
        errors.push(`Item ${i + 1}: ${err.message}`);
        // Close any open menu before trying the next item
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

  const result = {
    browser,
    downloaded_count: downloaded.length,
    skipped_count: skipped.length,
    files: downloaded,
    skipped: skipped.length > 0 ? skipped : undefined,
    errors: errors.length > 0 ? errors : undefined,
    next_step: downloaded.length > 0
      ? `Run /integrar-videos ${output_dir} to rename the files, copy them to the correct assets folder, and embed them in the EN and PT-BR docs.`
      : undefined,
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
