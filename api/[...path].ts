import app from "../server/index";
import type { Request, Response } from "express";

// Vercel's Node runtime already exposes the standard `(req, res)` interface
// that Express expects, so export the app directly. Vercel routes every
// /api/* request to this catch-all function.
export default function handler(req: Request, res: Response) {
  // Depending on the Vercel function route, `req.url` can be either the full
  // `/api/...` path or only the catch-all portion. Express owns `/api/*`, so
  // normalize the latter form before dispatching.
  if (!req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
  }
  return app(req, res);
}