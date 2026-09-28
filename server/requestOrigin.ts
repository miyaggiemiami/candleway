import type { Request } from "express";

/** Returns the origin of the current request without platform assumptions. */
export function getRequestOrigin(req: Request): string {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || req.protocol).split(",")[0];
  const forwardedHost = String(req.headers["x-forwarded-host"] || req.get("host") || "");
  return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
}