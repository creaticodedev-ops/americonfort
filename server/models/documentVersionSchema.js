import mongoose from 'mongoose';

/** Embedded version snapshot shared by Contract and Invoice instances */
export const documentVersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    savedAt: { type: Date, default: Date.now },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: '' },
    sourceData: { type: mongoose.Schema.Types.Mixed, default: {} },
    templateSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    renderedHtml: { type: String, default: '' },
    pdfUrl: { type: String, default: '' },
    pdfPath: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'final'], default: 'final' },
  },
  { _id: false }
);

export const templateSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    type: { type: String, default: '' },
    headerHtml: { type: String, default: '' },
    bodyHtml: { type: String, default: '' },
    termsHtml: { type: String, default: '' },
    footerHtml: { type: String, default: '' },
    customCss: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    companySignatureUrl: { type: String, default: '' },
    pageSize: { type: String, enum: ['A4', 'Letter'], default: 'A4' },
  },
  { _id: false }
);

export const MAX_DOCUMENT_VERSIONS = 25;
export const MAX_SECTION_HTML_BYTES = 1024 * 1024;

export default documentVersionSchema;
