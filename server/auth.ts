import { Request, Response, NextFunction } from "express";
import { createClient, User } from "@supabase/supabase-js";
import { db } from "./db/index";
import { users } from "./db/schema";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  authUser?: User;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No authorization header" });
  }
  if (!supabase) {
    return res.status(500).json({ error: "Supabase authentication is not configured" });
  }

  try {
    const { data, error } = await supabase.auth.getUser(authHeader.slice(7));
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid or expired Supabase session" });
    }

    req.userId = data.user.id;
    req.userEmail = data.user.email || "";
    req.authUser = data.user;

    // The Replit PostgreSQL tables are feature/profile storage only. Keep a
    // lightweight mirror so their existing foreign keys continue to work; the
    // account and password remain managed exclusively by Supabase Auth.
    await db.insert(users)
      .values({ id: data.user.id, email: data.user.email || "", password_hash: "supabase-auth" })
      .onConflictDoUpdate({
        target: users.id,
        set: { email: data.user.email || "" },
      });

    next();
  } catch (error) {
    console.error("Supabase auth verification error:", error);
    return res.status(401).json({ error: "Unable to verify Supabase session" });
  }
}
