import express from "express";
import "dotenv/config";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import connectDB from "./configs/db.js";
import userRouter from "./routes/userRoutes.js";
import ownerRouter from "./routes/ownerRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import pickupLocationRouter from "./routes/pickupLocationRoutes.js";
import completionRouter from "./routes/bookingCompletionRoutes.js";
import superAdminRouter from "./routes/superAdminRoutes.js";
import contractRouter from "./routes/contractRoutes.js";
import invoiceRouter from "./routes/invoiceRoutes.js";
import exportTemplateRouter from "./routes/exportTemplateRoutes.js";
import { protectDocumentUploads } from "./middleware/uploadAccess.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, "../client/dist");
const clientIndexPath = path.resolve(__dirname, "../client/index.html");
const hasBuiltClient = fs.existsSync(path.join(clientDistPath, "index.html"));

const requiredEnv = ["MONGODB_URI", "JWT_SECRET"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (String(process.env.JWT_SECRET).length < 32) {
  const msg = "JWT_SECRET must be at least 32 characters for production security";
  if (process.env.NODE_ENV === "production") {
    console.error(msg);
    process.exit(1);
  }
  console.warn(`[security] ${msg} (allowed in non-production)`);
}

const app = express();

// Needed for correct client IP behind reverse proxies (rate limiting)
if (process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

await connectDB();

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean)
  : ["https://americonfort.com","https://www.americonfort.com","http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Baseline security headers (no extra dependency)
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
});

// Signature payloads can be larger than default
app.use(express.json({ limit: "4mb" }));

// Sensitive docs require signed URL or admin JWT
app.use(
  "/uploads",
  protectDocumentUploads,
  express.static(path.join(__dirname, "uploads"), {
    fallthrough: false,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  })
);

app.get("/", (_req, res) => res.json({ success: true, message: "Server is running" }));

app.get("/health", async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbOk = dbState === 1;
  res.status(dbOk ? 200 : 503).json({
    success: dbOk,
    status: dbOk ? "healthy" : "degraded",
    database: dbOk ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

if (hasBuiltClient) {
  app.use(express.static(clientDistPath, { index: false }));
}

app.use("/api/user", userRouter);
app.use("/api/owner", ownerRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/pickup-locations", pickupLocationRouter);
app.use("/api/booking-completion", completionRouter);
app.use("/api/super-admin", superAdminRouter);
app.use("/api/contracts", contractRouter);
app.use("/api/invoices", invoiceRouter);
app.use("/api/export-templates", exportTemplateRouter);

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  if (!req.accepts("html")) {
    return next();
  }

  const indexFile = hasBuiltClient ? path.join(clientDistPath, "index.html") : clientIndexPath;
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }

  return next();
});

app.use((_req, res) => {
  const path = _req.originalUrl || _req.url;
  let message = "Route not found";
  if (path.includes("/api/api/")) {
    message =
      "Route not found — API base URL likely includes `/api` twice. Set VITE_BASE_URL to the server origin only (e.g. http://localhost:3000), not http://localhost:3000/api";
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[404] ${_req.method} ${path}`);
  }
  res.status(404).json({ success: false, message, path: process.env.NODE_ENV !== "production" ? path : undefined });
});

app.use((err, _req, res, _next) => {
  console.error(err?.message || err);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, message: "CORS policy violation" });
  }
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    '[routes] Booking workflow: POST /api/booking-completion/owner/ensure-link, /api/bookings/owner/completion/ensure-link',
  );
});

export default app;
