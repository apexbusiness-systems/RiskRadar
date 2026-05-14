import express, { type Express, type Request } from "express";
import crypto from "crypto";

// Augment Request to carry rawBody for HMAC-verified routes.
type RawBodyRequest = Request & { rawBody?: Buffer };
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { idempotencyMiddleware } from "./middlewares/idempotency";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      // Preserve upstream request id when present for cross-service traceability.
      const existing = req.headers["x-request-id"];
      const requestId = Array.isArray(existing) ? existing[0] : existing;
      const safeRequestId =
        typeof requestId === "string" && requestId.trim().length > 0
          ? requestId.trim().slice(0, 128)
          : crypto.randomUUID();
      res.setHeader("x-request-id", safeRequestId);
      return safeRequestId;
    },
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "https://*.clerk.accounts.dev"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https:"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["'self'", "https://*.clerk.accounts.dev"],
        "frame-src": ["'self'", "https://*.clerk.accounts.dev"],
        "frame-ancestors": ["'self'"],
        "object-src": ["'none'"],
      },
    },
  }),
);

// Clerk proxy must come before body parsers (streams raw bytes)
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// CORS — localhost in dev, plus any origins listed in ALLOWED_ORIGINS (comma-separated full URLs).
// Example: ALLOWED_ORIGINS=https://app.example.com,https://staging.example.com
const rawOrigins = process.env.ALLOWED_ORIGINS ?? "";
const allowedOriginStrings = [
  "http://localhost:3000",
  "http://localhost:5173",
  ...rawOrigins
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
];
const allowedOrigins = new Set(allowedOriginStrings);

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      let parsed: URL;
      try {
        parsed = new URL(origin);
      } catch {
        logger.warn({ origin }, "security.cors.reject_malformed_origin");
        callback(new Error("CORS: malformed origin"));
        return;
      }
      if (allowedOrigins.has(parsed.origin)) {
        return callback(null, true);
      }
      // In development allow everything
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      logger.warn({ origin: parsed.origin }, "security.cors.reject_origin");
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
  }),
);

app.use(
  express.json({
    limit: "5mb",
    verify: (req: RawBodyRequest, _res, buf) => {
      // Capture raw bytes for HMAC verification on internal FlowC routes only.
      const url = (req as Request).originalUrl ?? (req as Request).url ?? "";
      if (url.startsWith("/api/internal/flowc")) {
        req.rawBody = buf;
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// Rate limiting on expensive / seed endpoints
const seedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down" },
});

const importLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many import requests, please slow down" },
});

app.use("/api/me/seed", seedLimiter);
app.use("/api/obligations/import", importLimiter);

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", idempotencyMiddleware);
app.use("/api", router);

export default app;
