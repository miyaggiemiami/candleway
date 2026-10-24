import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function initializeFirebaseAdmin() {
  if (getApps().length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId || serviceAccount.project_id,
    });
  } else if (clientEmail && privateKey && projectId) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && projectId) {
    initializeApp({ credential: applicationDefault(), projectId });
  } else {
    throw new Error(
      "Configure Firebase Admin with FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY/FIREBASE_PROJECT_ID, or Google Application Default Credentials."
    );
  }
}

export function getFirebaseAdminAuth() {
  initializeFirebaseAdmin();
  return getAuth();
}

export function getFirebaseDatabase() {
  initializeFirebaseAdmin();
  return getFirestore();
}

export function getFirebaseStorageBucket() {
  initializeFirebaseAdmin();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("FIREBASE_STORAGE_BUCKET is required to store chart images");
  return getStorage().bucket(bucketName);
}
