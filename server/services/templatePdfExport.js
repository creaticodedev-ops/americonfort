import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import {
  buildDocumentHtml,
  buildTemplateVariables,
  renderTemplate,
} from './templateEngine.js';
import { publicUploadUrl } from './pdfDocuments.js';

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

const renderHtmlToPdf = async (html, filePath, pageSize = 'A4') => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
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
  console.log('[PDF_GEN] Starting contract generation for:', contractNumber);
  console.log('[PDF_GEN] Booking signature URL:', booking?.completion?.signatureUrl);
  
  const variables = buildTemplateVariables(booking, { contractNumber, owner, template, includeCompanyStamp });
  console.log('[PDF_GEN] Template variables built. Signature HTML:', 
    variables.customer_signature_html?.substring(0, 100));
  
  const fullHtml = buildDocumentHtml(template, variables);
  console.log('[PDF_GEN] HTML built. Checking for signature img tag...');
  
  if (fullHtml.includes('Customer signature') || fullHtml.includes('customer_signature_html')) {
    console.log('[PDF_GEN] ✓ Signature placeholder found in HTML');
    const sigMatch = fullHtml.match(/<img[^>]*alt="Customer signature"[^>]*>/);
    console.log('[PDF_GEN] Signature img tag:', sigMatch ? sigMatch[0].substring(0, 150) : 'NOT FOUND');
  }

  const dir = path.join(CONTRACTS_ROOT, String(owner._id || owner));
  ensureDir(dir);
  const token = Math.random().toString(36).slice(2, 10);
  const fileName = `contract-${contractNumber.replace(/[^a-zA-Z0-9-]/g, '')}-${token}.pdf`;
  const filePath = path.join(dir, fileName);

  console.log('[PDF_GEN] Rendering HTML to PDF at:', filePath);
  await generatePdfFromTemplate({
    template,
    variables,
    filePath,
    title: `Contract ${contractNumber}`,
  });
  
  console.log('[PDF_GEN] PDF generated successfully');

  return {
    filePath,
    pdfUrl: publicUploadUrl(filePath),
    renderedHtml: fullHtml,
    variables,
  };
};

export const generateDocumentFromTemplate = async ({ template, booking, owner, documentTitle, includeCompanyStamp = true }) => {
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
