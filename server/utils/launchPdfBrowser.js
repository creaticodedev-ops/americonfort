/**
 * Shared Chromium instance for PDF generation.
 * Launching Chrome per request is the dominant latency on contract/invoice PDFs.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '..');

const IDLE_CLOSE_MS = Number(process.env.PDF_BROWSER_IDLE_MS || 60_000);

const existsFile = (candidate) => {
  try {
    return Boolean(candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  } catch {
    return false;
  }
};

const findChromeInCacheDir = (cacheDir) => {
  if (!cacheDir || !fs.existsSync(cacheDir)) return null;
  const chromeRoot = path.join(cacheDir, 'chrome');
  if (!fs.existsSync(chromeRoot)) return null;

  const platforms = fs.readdirSync(chromeRoot);
  for (const platform of platforms) {
    const platformDir = path.join(chromeRoot, platform);
    if (!fs.statSync(platformDir).isDirectory()) continue;

    const candidates = [
      path.join(platformDir, 'chrome-linux64', 'chrome'),
      path.join(platformDir, 'chrome-linux', 'chrome'),
      path.join(platformDir, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      path.join(platformDir, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      path.join(platformDir, 'chrome-win64', 'chrome.exe'),
      path.join(platformDir, 'chrome-win', 'chrome.exe'),
    ];
    for (const candidate of candidates) {
      if (existsFile(candidate)) return candidate;
    }
  }
  return null;
};

/** Ordered list of Chrome executable candidates for this host. */
export const resolveChromeExecutablePath = () => {
  const envPath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    process.env.CHROME_BIN ||
    '';

  if (existsFile(envPath)) return envPath;

  const configuredCaches = [
    process.env.PUPPETEER_CACHE_DIR,
    path.join(SERVER_ROOT, '.cache', 'puppeteer'),
    path.join(os.homedir(), '.cache', 'puppeteer'),
    '/opt/render/project/src/.cache/puppeteer',
    '/opt/render/project/.cache/puppeteer',
  ].filter(Boolean);

  for (const cacheDir of configuredCaches) {
    const found = findChromeInCacheDir(cacheDir);
    if (found) return found;
  }

  const systemBins = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ];
  for (const bin of systemBins) {
    if (existsFile(bin)) return bin;
  }

  return undefined;
};

let browserPromise = null;
let idleTimer = null;
let activeJobs = 0;
/** Serialize PDF jobs — one page at a time keeps small hosts stable. */
let jobTail = Promise.resolve();

const clearIdleTimer = () => {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
};

const scheduleIdleClose = () => {
  clearIdleTimer();
  if (activeJobs > 0) return;
  idleTimer = setTimeout(() => {
    if (activeJobs > 0) return;
    const pending = browserPromise;
    browserPromise = null;
    pending
      ?.then((browser) => browser?.close?.())
      .catch(() => {});
  }, IDLE_CLOSE_MS);
};

const attachBrowserGuards = (browser) => {
  browser.on('disconnected', () => {
    browserPromise = null;
  });
  return browser;
};

const createBrowser = async () => {
  const executablePath = resolveChromeExecutablePath();
  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-first-run',
    ],
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  try {
    const browser = await puppeteer.launch(launchOptions);
    return attachBrowserGuards(browser);
  } catch (error) {
    const hint =
      'Chrome/Chromium was not found for Puppeteer. ' +
      'On Render, ensure the build installs Chrome into the project cache ' +
      '(see server/.puppeteerrc.cjs and npm run install:chrome), ' +
      'or set PUPPETEER_EXECUTABLE_PATH to a system Chrome binary.';
    const wrapped = new Error(`${hint} Original: ${error.message}`);
    wrapped.cause = error;
    throw wrapped;
  }
};

const getSharedBrowser = async () => {
  if (!browserPromise) {
    browserPromise = createBrowser().catch((error) => {
      browserPromise = null;
      throw error;
    });
  }
  const browser = await browserPromise;
  if (!browser?.connected) {
    browserPromise = null;
    return getSharedBrowser();
  }
  return browser;
};

/**
 * Launch or return the shared browser.
 * Callers must NOT close it in request handlers — use withPdfPage instead.
 * One-off scripts may close it after they finish.
 */
export const launchPdfBrowser = async () => getSharedBrowser();

/**
 * Run work against a fresh page on the shared browser.
 * Pages are always closed; the browser stays warm between jobs.
 */
export const withPdfPage = async (fn) => {
  let release = null;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const previous = jobTail;
  jobTail = previous.then(() => gate, () => gate);

  await previous.catch(() => {});

  activeJobs += 1;
  clearIdleTimer();
  let page = null;

  try {
    const browser = await getSharedBrowser();
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(45_000);
    return await fn(page);
  } catch (error) {
    if (/Target closed|Session closed|Browser disconnected|Protocol error/i.test(String(error?.message || ''))) {
      browserPromise = null;
    }
    throw error;
  } finally {
    if (page) {
      try {
        await page.close({ runBeforeUnload: false });
      } catch {
        /* ignore */
      }
    }
    activeJobs = Math.max(0, activeJobs - 1);
    release?.();
    scheduleIdleClose();
  }
};

export default launchPdfBrowser;
