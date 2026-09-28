import "dotenv/config";
import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No authorization header" });
  }
  if (!supabase) {
    return res.status(503).json({ error: "Supabase authentication is not configured" });
  }

  const token = authHeader.slice(7);
  void supabase.auth.getUser(token).then(({ data, error }) => {
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid or expired Supabase session" });
    }
    req.userId = data.user.id;
    req.userEmail = data.user.email;
    return next();
  }).catch((error) => {
    console.error("Supabase auth verification error:", error);
    return res.status(401).json({ error: "Unable to verify Supabase session" });
  });
}
