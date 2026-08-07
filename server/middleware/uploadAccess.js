import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import imagekit from '../configs/imageKit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

const hmacSecret = () => process.env.JWT_SECRET || 'dev';

/** Default short-lived access for customer documents (15 minutes). */
export const getDocSignedUrlTtl = () => {
  const n = Number(process.env.DOC_SIGNED_URL_TTL_SECONDS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 60 * 15;
};

/**
 * Create a time-limited signature for a path under /uploads.
 * relPath example: "documents/RES-123/contract.pdf"
 */
export const signUploadAccess = (relPath, expiresInSec = getDocSignedUrlTtl()) => {
  const normalized = String(relPath || '').replace(/^\/+/, '').replace(/\\/g, '/');
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const sig = crypto
    .createHmac('sha256', hmacSecret())
    .update(`${normalized}:${exp}`)
    .digest('hex');
  return { path: normalized, exp, sig };
};

export const verifyUploadAccess = (relPath, exp, sig) => {
  const normalized = String(relPath || '').replace(/^\/+/, '').replace(/\\/g, '/');
  const expNum = Number(exp);
  if (!normalized || !sig || !Number.isFinite(expNum)) return false;
  if (expNum < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto
    .createHmac('sha256', hmacSecret())
    .update(`${normalized}:${expNum}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(sig)));
  } catch {
    return false;
  }
};

export const appendSignedQuery = (absoluteOrPublicUrl, expiresInSec = getDocSignedUrlTtl()) => {
  if (!absoluteOrPublicUrl) return absoluteOrPublicUrl;
  try {
    const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
    const url = new URL(
      absoluteOrPublicUrl.startsWith('http')
        ? absoluteOrPublicUrl
        : `${base}${absoluteOrPublicUrl.startsWith('/') ? '' : '/'}${absoluteOrPublicUrl}`
    );
    const marker = '/uploads/';
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return absoluteOrPublicUrl;
    const rel = url.pathname.slice(idx + marker.length);
    const { exp, sig } = signUploadAccess(rel, expiresInSec);
    url.searchParams.set('exp', String(exp));
    url.searchParams.set('sig', sig);
    return url.toString();
  } catch {
    return absoluteOrPublicUrl;
  }
};

const imageKitConfigured = () =>
  Boolean(
    process.env.IMAGEKIT_PUBLIC_KEY &&
      process.env.IMAGEKIT_PRIVATE_KEY &&
      process.env.IMAGEKIT_URL_ENDPOINT
  );

/** Extract ImageKit file path from a stored URL (strips query + optional tr: transforms). */
export const extractImageKitPath = (absoluteUrl) => {
  if (!absoluteUrl || !process.env.IMAGEKIT_URL_ENDPOINT) return null;
  try {
    const endpoint = new URL(process.env.IMAGEKIT_URL_ENDPOINT);
    const url = new URL(absoluteUrl);
    if (url.host !== endpoint.host) return null;

    let filePath = url.pathname;
    const endpointBase = endpoint.pathname.replace(/\/$/, '');
    if (endpointBase && filePath.startsWith(endpointBase)) {
      filePath = filePath.slice(endpointBase.length) || '/';
    }
    // Drop leading transformation segment: /tr:w-1600,q-auto/...
    filePath = filePath.replace(/^\/tr:[^/]+/, '');
    if (!filePath.startsWith('/')) filePath = `/${filePath}`;
    return filePath;
  } catch {
    return null;
  }
};

/**
 * Issue a short-lived access URL for customer documents:
 * - local /uploads/documents → HMAC query
 * - ImageKit private files → signed URL
 */
export const signDocumentAccessUrl = (absoluteOrPublicUrl, expiresInSec = getDocSignedUrlTtl()) => {
  if (!absoluteOrPublicUrl) return '';
  const raw = String(absoluteOrPublicUrl);
  if (raw.includes('/uploads/documents') || raw.includes('/uploads/templates')) {
    return appendSignedQuery(raw, expiresInSec);
  }
  if (!imageKitConfigured() || !imagekit) return raw;

  const filePath = extractImageKitPath(raw);
  if (!filePath) return raw;

  try {
    return imagekit.url({
      path: filePath,
      signed: true,
      expireSeconds: expiresInSec,
      transformation: [{ width: '1600' }, { quality: 'auto' }],
    });
  } catch (error) {
    console.error('[docs] Failed to sign ImageKit URL:', error.message);
    return raw;
  }
};

/**
 * Protect /uploads/documents — requires signed query OR owner/superadmin JWT.
 * Other /uploads paths (if any) remain public.
 */
export const protectDocumentUploads = async (req, res, next) => {
  // Only gate the documents tree
  const rel = req.path.replace(/^\/+/, '');
  if (!rel.startsWith('documents')) {
    return next();
  }

  const { sig, exp } = req.query;
  if (verifyUploadAccess(rel, exp, sig)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded?._id || decoded).select('role accountStatus tokenVersion');
      if (
        user &&
        ['owner', 'superadmin'].includes(user.role) &&
        (!user.accountStatus || user.accountStatus === 'active')
      ) {
        const tv = decoded.tv ?? 0;
        if ((user.tokenVersion || 0) === tv) {
          return next();
        }
      }
    } catch {
      /* fall through */
    }
  }

  return res.status(401).json({ success: false, message: 'Document access denied' });
};

/** Safe send of a file under uploads (path traversal guard) */
export const resolveUploadFile = (relPath) => {
  const normalized = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  const absolute = path.join(UPLOADS_ROOT, normalized);
  if (!absolute.startsWith(UPLOADS_ROOT)) return null;
  if (!fs.existsSync(absolute)) return null;
  return absolute;
};

export default {
  signUploadAccess,
  verifyUploadAccess,
  appendSignedQuery,
  signDocumentAccessUrl,
  extractImageKitPath,
  getDocSignedUrlTtl,
  protectDocumentUploads,
};
