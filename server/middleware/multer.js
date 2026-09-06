import multer from 'multer';
import fs from 'fs';

const storage = multer.diskStorage({});

const fileFilter = (_req, file, cb) => {
  const mime = String(file.mimetype || '').toLowerCase();
  const name = String(file.originalname || '').toLowerCase();
  if (mime.startsWith('image/')) return cb(null, true);
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return cb(null, true);
  return cb(new Error('Only image or PDF files are allowed'), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter,
});

export const handleMulterError = (err, _req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File must be under 8MB' });
  }
  if (err.message === 'Only image or PDF files are allowed' || err.message === 'Only image files are allowed') {
    return res.status(400).json({ success: false, message: 'Only image or PDF files are allowed' });
  }
  return res.status(400).json({ success: false, message: 'File upload failed' });
};

export const cleanupUploadedFile = (file) => {
  if (file?.path && fs.existsSync(file.path)) {
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
  }
};

export default upload;
