import { Request, Response, NextFunction } from "express";
import { getFirebaseAdminAuth, getFirebaseDatabase } from "./firebaseAdmin";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  firebaseUid?: string;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No authorization header" });
  }

  let adminAuth;
  try {
    adminAuth = getFirebaseAdminAuth();
  } catch (error) {
    console.error("Firebase Admin authentication is not configured correctly:", error);
    return res.status(503).json({ error: "Server authentication is not configured correctly" });
  }

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return res.status(401).json({ error: "Invalid or expired Firebase session" });
  }

  if (!decodedToken.email) {
    return res.status(401).json({ error: "Firebase account has no email address" });
  }

  try {
    req.firebaseUid = decodedToken.uid;
    req.userEmail = decodedToken.email.toLowerCase();
    req.userId = decodedToken.uid;
    await getFirebaseDatabase().collection("users").doc(decodedToken.uid).set({
      email: req.userEmail,
      firebase_uid: decodedToken.uid,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    next();
  } catch (error) {
    console.error("Firebase user synchronization error:", error);
    return res.status(500).json({ error: "Could not synchronize authenticated user" });
  }
}
