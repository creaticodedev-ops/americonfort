import fs from 'fs';

/**
 * Stream a PDF file to the response with safe error handling.
 * Prevents unhandled stream errors from becoming a generic Express 500.
 */
export const streamPdfFile = (res, filePath, downloadName = 'document.pdf') => {
  const safeName = String(downloadName || 'document.pdf').replace(/[^\w.-]+/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);

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
