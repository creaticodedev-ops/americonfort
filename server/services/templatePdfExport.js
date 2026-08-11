import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildDocumentHtml,
  buildTemplateVariables,
  buildTemplateVariablesAsync,
  renderTemplate,
} from './templateEngine.js';
import { publicUploadUrl } from './pdfDocuments.js';
import { launchPdfBrowser } from '../utils/launchPdfBrowser.js';
import { resolveImageAsDataUri } from '../utils/uploadPaths.js';

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
      const dataUri = await resolveImageAsDataUri(url);
      if (dataUri) replacements.set(url, dataUri);
    }),
  );

  let next = html;
  for (const [url, dataUri] of replacements.entries()) {
    next = next.split(url).join(dataUri);
  }
  return next;
};

/** Pre-resolve template logo/signature so PDF never depends on ephemeral local disk alone. */
const embedTemplateAssetUrls = async (template = {}, { includeCompanyStamp = true } = {}) => {
  const next = { ...(template?.toObject ? template.toObject() : template) };
  if (next.logoUrl) {
    const logoData = await resolveImageAsDataUri(next.logoUrl);
    if (logoData) next.logoUrl = logoData;
  }
  if (!includeCompanyStamp) {
    // Keep stamp completely out of the render pipeline when disabled.
    next.companySignatureUrl = '';
    next.signatureUrl = '';
    return next;
  }
  const signatureUrl = next.companySignatureUrl || next.signatureUrl;
  if (signatureUrl) {
    const sigData = await resolveImageAsDataUri(signatureUrl);
    if (sigData) {
      next.companySignatureUrl = sigData;
      next.signatureUrl = sigData;
    }
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
  const readyTemplate = await embedTemplateAssetUrls(template);
  const fullHtml = buildDocumentHtml(readyTemplate, variables);
  const html = fullHtml.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
  await renderHtmlToPdf(html, filePath, readyTemplate?.pageSize || 'A4');
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

  const readyTemplate = await embedTemplateAssetUrls(template, { includeCompanyStamp });
  const variables = await buildTemplateVariablesAsync(booking, {
    contractNumber,
    owner,
    template: readyTemplate,
    includeCompanyStamp,
  });
  const fullHtml = buildDocumentHtml(readyTemplate, variables);

  const dir = path.join(CONTRACTS_ROOT, String(owner._id || owner));
  ensureDir(dir);
  const token = Math.random().toString(36).slice(2, 10);
  const safeNumber = String(contractNumber || 'contract').replace(/[^a-zA-Z0-9-_]/g, '');
  const fileName = `contract-${safeNumber}-${token}.pdf`;
  const filePath = path.join(dir, fileName);

  await generatePdfFromTemplate({
    template: readyTemplate,
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

  const readyTemplate = await embedTemplateAssetUrls(template, { includeCompanyStamp });
  const variables = await buildTemplateVariablesAsync(booking, {
    owner,
    template: readyTemplate,
    includeCompanyStamp,
  });
  const fullHtml = buildDocumentHtml(readyTemplate, variables);

  const dir = path.join(CONTRACTS_ROOT, String(owner._id || owner), 'exports');
  ensureDir(dir);
  const token = Math.random().toString(36).slice(2, 10);
  const fileName = `${readyTemplate.type || template.type || 'doc'}-${token}.pdf`;
  const filePath = path.join(dir, fileName);

  await generatePdfFromTemplate({
    template: readyTemplate,
    variables,
    filePath,
    title: documentTitle || readyTemplate.name || template.name,
  });

  return {
    filePath,
    pdfUrl: publicUploadUrl(filePath),
    renderedHtml: fullHtml,
    variables,
  };
};

export { renderTemplate, buildTemplateVariables, buildTemplateVariablesAsync, buildDocumentHtml };

export default {
  generateContractPdf,
  generateDocumentFromTemplate,
  generatePdfFromHtml,
  generatePdfFromTemplate,
};
