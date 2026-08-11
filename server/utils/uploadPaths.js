import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { signDocumentAccessUrl } from '../middleware/uploadAccess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '..');

const mimeFromPath = (filePath = '') => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  return 'image/jpeg';
};

const fileToDataUri = (filePath) => {
  const buf = fs.readFileSync(filePath);
  return `data:${mimeFromPath(filePath)};base64,${buf.toString('base64')}`;
};

/**
 * Resolve a stored upload URL to a local filesystem path under server/uploads.
 * Tolerates API_PUBLIC_URL drift by extracting any `/uploads/...` segment.
 */
export const resolveLocalUploadPath = (publicUrl) => {
  if (!publicUrl) return null;
  const raw = String(publicUrl).trim();
  if (!raw || raw.startsWith('data:')) return null;

  const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');

  let rel = null;
  if (raw.startsWith(base)) {
    rel = raw.slice(base.length).replace(/^\//, '').split('?')[0];
  } else if (raw.startsWith('/uploads/')) {
    rel = raw.replace(/^\//, '').split('?')[0];
  } else {
    const marker = '/uploads/';
    const idx = raw.indexOf(marker);
    if (idx !== -1) {
      rel = raw.slice(idx + 1).split('?')[0];
    } else if (!raw.includes('://')) {
      rel = raw.replace(/^\//, '').split('?')[0];
    }
  }

  if (!rel || !rel.startsWith('uploads/')) return null;

  const abs = path.join(SERVER_ROOT, rel.replace(/\//g, path.sep));
  const normalizedRoot = path.resolve(path.join(SERVER_ROOT, 'uploads'));
  const normalizedAbs = path.resolve(abs);
  if (!normalizedAbs.startsWith(normalizedRoot)) return null;
  return fs.existsSync(normalizedAbs) ? normalizedAbs : null;
};

/** Host-stable relative path for local uploads, e.g. `/uploads/templates/logo-x.png` */
export const toRelativeUploadUrl = (absolutePath) => {
  if (!absolutePath) return '';
  const rel = path.relative(SERVER_ROOT, absolutePath).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..')) return '';
  return `/${rel}`;
};

/** Read a local logo/signature file as data URI for reliable HTML/PDF embedding */
export const logoToDataUri = (logoUrl) => {
  const filePath = resolveLocalUploadPath(logoUrl);
  if (!filePath) return null;
  try {
    return fileToDataUri(filePath);
  } catch (error) {
    console.error('[IMAGE] Failed to read local asset:', error.message);
    return null;
  }
};

/**
 * Resolve any stored image URL (local, ImageKit, absolute) to a data URI.
 * Used before Puppeteer so PDF generation does not depend on live network/CDN.
 */
export const resolveImageAsDataUri = async (imageUrl, { timeoutMs = 12_000 } = {}) => {
  if (!imageUrl) return null;
  const raw = String(imageUrl).trim();
  if (!raw) return null;
  if (raw.startsWith('data:image')) return raw;

  const local = logoToDataUri(raw);
  if (local) return local;

  const src = signDocumentAccessUrl(raw, 60 * 60);
  if (!src || !/^https?:\/\//i.test(src)) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(src, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn('[IMAGE] Remote fetch failed:', res.status, src.slice(0, 120));
      return null;
    }
    const contentType = (res.headers.get('content-type') || mimeFromPath(src)).split(';')[0].trim();
    if (!contentType.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > 8 * 1024 * 1024) return null;
    return `data:${contentType};base64,${buf.toString('base64')}`;
  } catch (error) {
    console.warn('[IMAGE] Could not resolve remote image:', src.slice(0, 120), error.message);
    return null;
  }
};

/**
 * Inline customer / second-driver completion signatures as data URIs.
 * Agency/company stamp is handled separately (template assets) and must not be touched here.
 *
 * Why: those signatures are private ImageKit files or HMAC-gated /uploads/documents paths.
 * Emitting a remote <img src> often produces a broken icon in preview/PDF. If bytes cannot
 * be resolved, clear the URL so the template shows an empty signature area instead.
 */
export const embedCompletionSignatures = async (booking) => {
  if (!booking) return booking;
  const next = booking?.toObject ? booking.toObject() : { ...booking };
  const completion = { ...(next.completion || {}) };
  let changed = false;

  for (const key of ['signatureUrl', 'secondDriverSignatureUrl']) {
    const raw = completion[key];
    if (!raw || String(raw).trim() === '') continue;
    if (String(raw).startsWith('data:image')) continue;

    const dataUri = await resolveImageAsDataUri(raw);
    completion[key] = dataUri || '';
    changed = true;
    if (!dataUri) {
      console.warn(`[IMAGE] Clearing unresolved ${key} to avoid broken signature icon`);
    }
  }

  if (!changed) return next;
  next.completion = completion;
  return next;
};

export default {
  resolveLocalUploadPath,
  toRelativeUploadUrl,
  logoToDataUri,
  resolveImageAsDataUri,
  embedCompletionSignatures,
};
