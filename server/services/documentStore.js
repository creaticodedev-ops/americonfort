import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import imagekit from "../configs/imageKit.js";
import { cleanupUploadedFile } from "../middleware/multer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Upload image to ImageKit when configured; otherwise store locally under /uploads.
 */
export const storeDocumentImage = async (file, folder = "/booking-docs") => {
  console.log('[STORE_DOC_IMAGE] Storing image, folder:', folder, 'file:', file?.originalname);
  if (!file?.path) throw new Error("No file provided");

  const hasImageKit =
    process.env.IMAGEKIT_PUBLIC_KEY &&
    process.env.IMAGEKIT_PRIVATE_KEY &&
    process.env.IMAGEKIT_URL_ENDPOINT;
  console.log('[STORE_DOC_IMAGE] ImageKit available:', !!hasImageKit);

  if (hasImageKit) {
    try {
      const fileBuffer = fs.readFileSync(file.path);
      const response = await imagekit.upload({
        file: fileBuffer,
        fileName: file.originalname || `doc-${Date.now()}.jpg`,
        folder,
      });
      cleanupUploadedFile(file);
      return imagekit.url({
        path: response.filePath,
        transformation: [{ width: "1600" }, { quality: "auto" }],
      });
    } catch (error) {
      console.error("ImageKit document upload failed, falling back to local:", error.message);
    }
  }

  const reservationFolder = path.join(__dirname, "..", "uploads", "documents", "files");
  if (!fs.existsSync(reservationFolder)) fs.mkdirSync(reservationFolder, { recursive: true });
  const ext = path.extname(file.originalname || "") || ".jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const dest = path.join(reservationFolder, name);
  console.log('[STORE_DOC_IMAGE] Moving file from', file.path, 'to', dest);
  fs.renameSync(file.path, dest);

  const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, "");
  const url = `${base}/uploads/documents/files/${name}`;
  console.log('[STORE_DOC_IMAGE] Returning URL:', url);
  return url;
};

export const storeDataUrlImage = async (dataUrl, fileName = "signature.png") => {
  console.log('[STORE_DATA_URL] Storing image:', fileName);
  if (!dataUrl?.startsWith("data:image")) throw new Error("Invalid image data");
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid data URL");
  console.log('[STORE_DATA_URL] Decoded data URL, buffer size:', matches[2].length);
  const buffer = Buffer.from(matches[2], "base64");
  const tmpDir = path.join(__dirname, "..", "uploads", "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `${Date.now()}-${fileName}`);
  fs.writeFileSync(tmpPath, buffer);
  console.log('[STORE_DATA_URL] Written to temp:', tmpPath);
  const fakeFile = { path: tmpPath, originalname: fileName };
  const result = await storeDocumentImage(fakeFile, "/booking-signatures");
  console.log('[STORE_DATA_URL] Final URL returned:', result);
  return result;
};

export default { storeDocumentImage, storeDataUrlImage };
