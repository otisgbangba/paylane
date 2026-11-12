import "dotenv/config";
import path from "node:path";

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const jwtSecret = process.env.JWT_SECRET ?? "paylane-local-dev-secret-change-me-please-32";

if (nodeEnv === "production" && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production");
}
if (nodeEnv !== "test" && jwtSecret === "paylane-local-dev-secret-change-me-please-32") {
  console.warn("[config] Using the built-in development JWT secret. Set JWT_SECRET before deploying.");
}

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  jwtSecret,
  jwtExpiresIn: "7d",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3100",
  databaseUrl: process.env.DATABASE_URL?.trim() || null,
  pgliteDir: path.resolve(process.cwd(), process.env.PGLITE_DIR ?? ".data/pglite"),
  cookieName: "paylane_session",
  cookieSecure: readBoolean(process.env.COOKIE_SECURE, nodeEnv === "production"),
  webhookSecret: process.env.VENDOR_WEBHOOK_SECRET ?? "dev-vendor-webhook-secret",
  apiKeyPepper: process.env.API_KEY_PEPPER ?? jwtSecret,
  identity: {
    /** AUTO uses the HTTP vendor only when a base URL and key are configured. */
    mode: (process.env.IDENTITY_VENDOR_MODE ?? "AUTO").toUpperCase() as "AUTO" | "HTTP" | "MOCK",
    baseUrl: process.env.IDENTITY_VENDOR_BASE_URL?.trim() || null,
    apiKey: process.env.IDENTITY_VENDOR_API_KEY?.trim() || null,
    apiSecret: process.env.IDENTITY_VENDOR_API_SECRET?.trim() || null,
    verifyPath: process.env.IDENTITY_VENDOR_VERIFY_PATH?.trim() || "/verify",
    timeoutMs: Number(process.env.IDENTITY_VENDOR_TIMEOUT_MS ?? 15_000),
    resultRetentionDays: Number(process.env.IDENTITY_RESULT_RETENTION_DAYS ?? 90),
    digestSecret: process.env.IDENTITY_DIGEST_SECRET ?? jwtSecret,
  },
} as const;

export const identityVendorConfigured = Boolean(
  env.identity.baseUrl && env.identity.apiKey,
);