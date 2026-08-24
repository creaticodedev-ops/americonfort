import fs from 'fs';

/**
 * Stream a PDF file to the response with safe error handling.
 * Prevents unhandled stream errors from becoming a generic Express 500.
 */
export const streamPdfFile = (res, filePath, downloadName = 'document.pdf', { inline = false } = {}) => {
  const safeName = String(downloadName || 'document.pdf').replace(/[^\w.-]+/g, '_');
  const filename = safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${filename}"`);

  const stream = fs.createReadStream(filePath);
  stream.on('error', (error) => {
    console.error('[pdf stream]', error?.message || error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to read PDF file' });
      return;
    }
    res.destroy(error);
  });
  stream.pipe(res);
};

export default streamPdfFile;
