import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import imagekit from "../configs/imageKit.js";
import { cleanupUploadedFile } from "../middleware/multer.js";
import { toRelativeUploadUrl } from "../utils/uploadPaths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ASSET_DIR = path.join(__dirname, "..", "uploads", "templates");

const imageKitConfigured = () =>
  Boolean(
    process.env.IMAGEKIT_PUBLIC_KEY &&
      process.env.IMAGEKIT_PRIVATE_KEY &&
      process.env.IMAGEKIT_URL_ENDPOINT
  );

/**
 * Canonical (unsigned) ImageKit URL for a file path.
 * Access URLs for private files are minted later via signDocumentAccessUrl.
 */
const canonicalImageKitUrl = (filePath) => {
  const endpoint = String(process.env.IMAGEKIT_URL_ENDPOINT || "").replace(/\/$/, "");
  const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${endpoint}${normalized}`;
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const moveUploadedFile = (uploadedFile, destPath) => {
  if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
  try {
    fs.renameSync(uploadedFile.path, destPath);
  } catch (error) {
    // Windows/cross-device temp dirs often fail rename with EXDEV
    if (error?.code === "EXDEV") {
      fs.copyFileSync(uploadedFile.path, destPath);
      fs.unlinkSync(uploadedFile.path);
    } else {
      throw error;
    }
  }
  return destPath;
};

/**
 * Upload sensitive booking docs/signatures as ImageKit private files when configured;
 * otherwise store locally under /uploads/documents (HMAC-gated).
 */
export const storeDocumentImage = async (file, folder = "/booking-docs") => {
  if (!file?.path) throw new Error("No file provided");

  if (imageKitConfigured() && imagekit) {
    try {
      const fileBuffer = fs.readFileSync(file.path);
      const response = await imagekit.upload({
        file: fileBuffer,
        fileName: file.originalname || `doc-${Date.now()}.jpg`,
        folder,
        isPrivateFile: true,
        useUniqueFileName: true,
      });
      cleanupUploadedFile(file);
      return canonicalImageKitUrl(response.filePath);
    } catch (error) {
      console.error("ImageKit document upload failed, falling back to local:", error.message);
    }
  }

  const reservationFolder = path.join(__dirname, "..", "uploads", "documents", "files");
  if (!fs.existsSync(reservationFolder)) fs.mkdirSync(reservationFolder, { recursive: true });
  const ext = path.extname(file.originalname || "") || ".jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const dest = path.join(reservationFolder, name);
  fs.renameSync(file.path, dest);

  const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, "");
  return `${base}/uploads/documents/files/${name}`;
};

export const storeDataUrlImage = async (dataUrl, fileName = "signature.png") => {
  if (!dataUrl?.startsWith("data:image")) throw new Error("Invalid image data");
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid data URL");
  const buffer = Buffer.from(matches[2], "base64");
  const tmpDir = path.join(__dirname, "..", "uploads", "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `${Date.now()}-${fileName}`);
  fs.writeFileSync(tmpPath, buffer);
  const fakeFile = { path: tmpPath, originalname: fileName };
  return storeDocumentImage(fakeFile, "/booking-signatures");
};

/**
 * Persist template logo/signature for durable reuse across deploys.
 * Prefer ImageKit (public branding assets). Always keep a local cache copy.
 * Returns a stable URL suitable for Mongo ExportTemplate.logoUrl / companySignatureUrl.
 */
export const storeTemplateAsset = async (file, { kind = "logo", templateId = "template" } = {}) => {
  if (!file?.path) throw new Error("No file provided");

  const ext = path.extname(file.originalname || "").toLowerCase();
  const safeExt = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext) ? ext : ".png";
  const safeKind = kind === "signature" ? "signature" : "logo";
  const fileName = `${safeKind}-${templateId}${safeExt}`;

  ensureDir(TEMPLATE_ASSET_DIR);
  const destPath = path.join(TEMPLATE_ASSET_DIR, fileName);
  moveUploadedFile(file, destPath);
  const localUrl = toRelativeUploadUrl(destPath);

  if (imageKitConfigured() && imagekit) {
    try {
      const fileBuffer = fs.readFileSync(destPath);
      const response = await imagekit.upload({
        file: fileBuffer,
        fileName,
        folder: "/template-assets",
        // Public branding assets — must survive deploys and render in PDF/admin without HMAC.
        isPrivateFile: false,
        useUniqueFileName: true,
      });
      return canonicalImageKitUrl(response.filePath);
    } catch (error) {
      console.error("ImageKit template asset upload failed, using local URL:", error.message);
    }
  }

  return localUrl;
};

export default { storeDocumentImage, storeDataUrlImage, storeTemplateAsset };
