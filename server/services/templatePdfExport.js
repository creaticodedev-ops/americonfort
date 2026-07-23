import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { buildDocumentHtml, buildTemplateVariables, renderTemplate } from './templateEngine.js';
import { publicUploadUrl } from './pdfDocuments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS_ROOT = path.join(__dirname, '..', 'uploads', 'contracts');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

/** Strip HTML tags and decode basic entities for PDF text rendering */
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
 * Generate PDF from rendered HTML content using PDFKit.
 * Converts HTML to structured plain text for reliable PDF output.
 */
export const generatePdfFromHtml = async (html, { filePath, title = 'Document' } = {}) => {
  ensureDir(path.dirname(filePath));
  const plainText = htmlToPlainText(html);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fillColor('#8F1F1F').fontSize(18).text(title, { align: 'left' });
    doc.moveDown(0.5);
    doc.fillColor('#333').fontSize(9).text(plainText, { align: 'left', lineGap: 3 });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

/**
 * Generate contract PDF from template + booking data.
 */
export const generateContractPdf = async ({ template, booking, contractNumber, owner }) => {
  const variables = buildTemplateVariables(booking, { contractNumber, owner });
  const fullHtml = buildDocumentHtml(template, variables);

  const dir = path.join(CONTRACTS_ROOT, String(owner._id || owner));
  ensureDir(dir);
  const token = Math.random().toString(36).slice(2, 10);
  const fileName = `contract-${contractNumber.replace(/[^a-zA-Z0-9-]/g, '')}-${token}.pdf`;
  const filePath = path.join(dir, fileName);

  await generatePdfFromHtml(fullHtml, { filePath, title: `Contract ${contractNumber}` });

  return {
    filePath,
    pdfUrl: publicUploadUrl(filePath),
    renderedHtml: fullHtml,
    variables,
  };
};

/**
 * Generate invoice PDF from template + booking (reusable export path).
 */
export const generateDocumentFromTemplate = async ({ template, booking, owner, documentTitle }) => {
  const variables = buildTemplateVariables(booking, { owner });
  const fullHtml = buildDocumentHtml(template, variables);

  const dir = path.join(CONTRACTS_ROOT, String(owner._id || owner), 'exports');
  ensureDir(dir);
  const token = Math.random().toString(36).slice(2, 10);
  const fileName = `${template.type || 'doc'}-${token}.pdf`;
  const filePath = path.join(dir, fileName);

  await generatePdfFromHtml(fullHtml, { filePath, title: documentTitle || template.name });

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
};
