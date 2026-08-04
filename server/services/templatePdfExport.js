import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildDocumentHtml,
  buildTemplateVariables,
  renderTemplate,
} from './templateEngine.js';
import { publicUploadUrl } from './pdfDocuments.js';
import { launchPdfBrowser } from '../utils/launchPdfBrowser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS_ROOT = path.join(__dirname, '..', 'uploads', 'contracts');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const htmlToPlainText = (html) => {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const mimeFromUrlOrPath = (value = '') => {
  const lower = String(value).toLowerCase();
  if (lower.includes('.png') || lower.includes('image/png')) return 'image/png';
  if (lower.includes('.webp') || lower.includes('image/webp')) return 'image/webp';
  if (lower.includes('.gif') || lower.includes('image/gif')) return 'image/gif';
  return 'image/jpeg';
};

/**
 * Embed remote <img src="http(s):..."> as data URIs so PDF rendering does not
 * depend on networkidle / external CDN availability.
 */
const embedRemoteImagesAsDataUris = async (html) => {
  const matches = [...String(html || '').matchAll(/<img\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>/gi)];
  if (!matches.length) return html;

  const uniqueUrls = [...new Set(matches.map((m) => m[1]))];
  const replacements = new Map();

  await Promise.all(
    uniqueUrls.map(async (url) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12_000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return;
        const contentType = (res.headers.get('content-type') || mimeFromUrlOrPath(url)).split(';')[0].trim();
        if (!contentType.startsWith('image/')) return;
        const buf = Buffer.from(await res.arrayBuffer());
        if (!buf.length || buf.length > 8 * 1024 * 1024) return;
        replacements.set(url, `data:${contentType};base64,${buf.toString('base64')}`);
      } catch (error) {
        console.warn('[PDF_GEN] Could not embed remote image:', url.slice(0, 120), error.message);
      }
    }),
  );

  let next = html;
  for (const [url, dataUri] of replacements.entries()) {
    next = next.split(url).join(dataUri);
  }
  return next;
};

const renderHtmlToPdf = async (html, filePath, pageSize = 'A4') => {
  const preparedHtml = await embedRemoteImagesAsDataUris(html);
  const browser = await launchPdfBrowser();

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(45_000);
    // Prefer load over networkidle0 — remote beacons/CDNs must not block PDF generation.
    await page.setContent(preparedHtml, { waitUntil: 'load', timeout: 45_000 });
    await page.emulateMediaType('print');
    await page.pdf({
      path: filePath,
      format: pageSize === 'Letter' ? 'Letter' : 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });
  } finally {
    await browser.close();
  }
};

export const generatePdfFromTemplate = async ({ template, variables, filePath, title = 'Document' }) => {
  ensureDir(path.dirname(filePath));
  const fullHtml = buildDocumentHtml(template, variables);
  const html = fullHtml.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
  await renderHtmlToPdf(html, filePath, template?.pageSize || 'A4');
  return filePath;
};

export const generatePdfFromHtml = async (html, { filePath, title = 'Document', template, variables } = {}) => {
  if (template && variables) {
    return generatePdfFromTemplate({ template, variables, filePath, title });
  }

  ensureDir(path.dirname(filePath));
  const plainText = htmlToPlainText(html);
  const fallbackHtml = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><title>${title}</title></head><body><pre>${plainText}</pre></body></html>`;
  await renderHtmlToPdf(fallbackHtml, filePath, 'A4');
  return filePath;
};

export const generateContractPdf = async ({ template, booking, contractNumber, owner, includeCompanyStamp = true }) => {
  if (!template) {
    throw new Error('Contract template is required');
  }
  if (!owner) {
    throw new Error('Contract owner is required');
  }

  const variables = buildTemplateVariables(booking, { contractNumber, owner, template, includeCompanyStamp });
  const fullHtml = buildDocumentHtml(template, variables);

  const dir = path.join(CONTRACTS_ROOT, String(owner._id || owner));
  ensureDir(dir);
  const token = Math.random().toString(36).slice(2, 10);
  const safeNumber = String(contractNumber || 'contract').replace(/[^a-zA-Z0-9-]/g, '');
  const fileName = `contract-${safeNumber}-${token}.pdf`;
  const filePath = path.join(dir, fileName);

  await generatePdfFromTemplate({
    template,
    variables,
    filePath,
    title: `Contract ${contractNumber}`,
  });

  return {
    filePath,
    pdfUrl: publicUploadUrl(filePath),
    renderedHtml: fullHtml,
    variables,
  };
};

export const generateDocumentFromTemplate = async ({ template, booking, owner, documentTitle, includeCompanyStamp = true }) => {
  if (!template) {
    throw new Error('Export template is required');
  }

  const variables = buildTemplateVariables(booking, { owner, template, includeCompanyStamp });
  const fullHtml = buildDocumentHtml(template, variables);

  const dir = path.join(CONTRACTS_ROOT, String(owner._id || owner), 'exports');
  ensureDir(dir);
  const token = Math.random().toString(36).slice(2, 10);
  const fileName = `${template.type || 'doc'}-${token}.pdf`;
  const filePath = path.join(dir, fileName);

  await generatePdfFromTemplate({
    template,
    variables,
    filePath,
    title: documentTitle || template.name,
  });

  return {
    filePath,
    pdfUrl: publicUploadUrl(filePath),
    renderedHtml: fullHtml,
    variables,
  };
};

export { renderTemplate, buildTemplateVariables, buildDocumentHtml };

export default {
  generateContractPdf,
  generateDocumentFromTemplate,
  generatePdfFromHtml,
  generatePdfFromTemplate,
};
