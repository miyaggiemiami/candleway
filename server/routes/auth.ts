import { Router } from "express";
import { db } from "../db/index";
import { users, profiles, passwordResets } from "../db/schema";
import { signToken, hashPassword, comparePassword, requireAuth, AuthenticatedRequest } from "../auth";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) return res.status(400).json({ error: "An account with this email already exists" });

    const password_hash = await hashPassword(password);
    const [user] = await db.insert(users).values({ email: email.toLowerCase(), password_hash }).returning();

    await db.insert(profiles).values({
      user_id: user.id,
      display_name: displayName || null,
    });

    const token = signToken({ userId: user.id, email: user.email });
    return res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err: any) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: err.message || "Signup failed" });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!user) return res.status(401).json({ error: "Invalid login credentials" });

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid login credentials" });

    const token = signToken({ userId: user.id, email: user.email });
    return res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err: any) {
    console.error("Signin error:", err);
    return res.status(500).json({ error: err.message || "Sign in failed" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!user) {
      return res.json({ message: "If an account with that email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await db.insert(passwordResets).values({
      user_id: user.id,
      token,
      expires_at: expiresAt,
    });

    const resetUrl = `${req.headers.origin || process.env.REPLIT_DOMAINS?.split(",")[0] || "http://localhost:5000"}/reset-password?token=${token}`;

    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@candleway.app";

    if (SENDGRID_API_KEY) {
      try {
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: user.email }] }],
            from: { email: FROM_EMAIL, name: "CandleWay" },
            subject: "Reset your CandleWay password",
            content: [{
              type: "text/html",
              value: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
            }],
          }),
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    } else {
      console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
    }

    return res.json({ message: "If an account with that email exists, a reset link has been sent." });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: err.message || "Failed" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Token and password are required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const [reset] = await db.select().from(passwordResets).where(eq(passwordResets.token, token)).limit(1);
    if (!reset || reset.used || reset.expires_at < new Date()) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const password_hash = await hashPassword(password);
    await db.update(users).set({ password_hash }).where(eq(users.id, reset.user_id));
    await db.update(passwordResets).set({ used: true }).where(eq(passwordResets.token, token));

    return res.json({ message: "Password updated successfully" });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: err.message || "Failed" });
  }
});

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ id: user.id, email: user.email });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
