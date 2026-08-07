import type { Request } from "express";

/**
 * Returns the public URL used by redirects in email and payment flows.
 * APP_URL should be set in hosted environments; the request fallback keeps
 * local development and preview deployments working without hardcoded hosts.
 */
export function getRequestOrigin(req: Request): string {
  const configuredOrigin =
    process.env.APP_URL ||
    process.env.URL ||
    (process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "");

  const requestOrigin = req.headers.origin || `${req.protocol}://${req.get("host")}`;
  return (configuredOrigin || requestOrigin || "http://localhost:5000").replace(/\/$/, "");
}