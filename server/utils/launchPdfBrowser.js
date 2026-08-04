/**
 * Resolve and launch Chromium for PDF generation.
 * Production (Render): Chrome lives in project `.cache/puppeteer` via `.puppeteerrc.cjs`.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '..');

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

  // Let Puppeteer resolve via its own config (.puppeteerrc.cjs).
  return undefined;
};

export const launchPdfBrowser = async () => {
  const executablePath = resolveChromeExecutablePath();
  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  try {
    return await puppeteer.launch(launchOptions);
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

export default launchPdfBrowser;
