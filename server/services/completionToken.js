import crypto from "crypto";

const TOKEN_BYTES = 32;
const DEFAULT_TTL_DAYS = 7;
const LOCAL_FALLBACK = "http://localhost:5173";
/** SPA host (apex americonfort.com is WordPress and cannot serve /complete-booking). */
const CANONICAL_SPA = "https://www.americonfort.com";

/**
 * Public SPA origin used in customer-facing completion / signature links.
 * Prefer CLIENT_URL (CORS allowlist may be comma-separated) then PUBLIC_SITE_URL.
 */
export const resolveClientBaseUrl = () => {
  const raw =
    process.env.CLIENT_URL
    || process.env.PUBLIC_SITE_URL
    || process.env.FRONTEND_URL
    || "";
  const first = String(raw).split(",")[0].trim().replace(/\/$/, "");

  if (first) {
    try {
      const u = new URL(first.includes("://") ? first : `https://${first}`);
      const host = u.hostname.toLowerCase();
      // Signature pages are served by the Vercel SPA on www — not WordPress on the apex.
      if (host === "americonfort.com" || host === "www.americonfort.com") {
        return CANONICAL_SPA;
      }
      return `${u.protocol}//${u.host}`.replace(/\/$/, "");
    } catch {
      return first;
    }
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[completionToken] CLIENT_URL / PUBLIC_SITE_URL is not set. "
        + `Falling back to ${CANONICAL_SPA} so signature links remain usable.`,
    );
    return CANONICAL_SPA;
  }
  return LOCAL_FALLBACK;
};

export const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

export const generateCompletionToken = () => {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + (Number(process.env.COMPLETION_TOKEN_DAYS) || DEFAULT_TTL_DAYS) * 86400000),
  };
};

export const buildCompletionUrl = (token) => {
  const base = resolveClientBaseUrl();
  return `${base}/complete-booking/${token}`;
};

/** True when a stored shareable URL no longer matches the configured public SPA origin. */
export const isStaleCompletionUrl = (url) => {
  const existing = String(url || "").trim();
  if (!existing) return true;
  try {
    const configured = new URL(resolveClientBaseUrl());
    const stored = new URL(existing);
    return stored.origin !== configured.origin;
  } catch {
    return true;
  }
};

export const isTokenExpired = (expiresAt) => {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() < Date.now();
};

export default {
  hashToken,
  generateCompletionToken,
  buildCompletionUrl,
  resolveClientBaseUrl,
  isStaleCompletionUrl,
  isTokenExpired,
};
