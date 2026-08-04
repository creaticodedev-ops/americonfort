import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '..');

/** Resolve a public upload URL to a local filesystem path when stored under server/uploads */
export const resolveLocalUploadPath = (publicUrl) => {
  if (!publicUrl) return null;
  const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');

  let rel = publicUrl;
  if (publicUrl.startsWith(base)) {
    rel = publicUrl.slice(base.length).replace(/^\//, '');
  } else if (publicUrl.startsWith('/uploads/')) {
    rel = publicUrl.replace(/^\//, '');
  } else if (!publicUrl.includes('://')) {
    rel = publicUrl.replace(/^\//, '');
  } else {
    return null;
  }

  const abs = path.join(SERVER_ROOT, rel.replace(/\//g, path.sep));
  return fs.existsSync(abs) ? abs : null;
};

/** Read logo file as data URI for reliable HTML/PDF embedding */
export const logoToDataUri = (logoUrl) => {
  const filePath = resolveLocalUploadPath(logoUrl);
  if (!filePath) return null;
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${buf.toString('base64')}`;
};

export default { resolveLocalUploadPath, logoToDataUri };
