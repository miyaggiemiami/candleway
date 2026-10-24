import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`);

if (missingConfig.length) {
  console.error(`Firebase is not configured. Missing: ${missingConfig.join(", ")}`);
}

const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: firebaseConfig.apiKey || "missing-firebase-api-key",
      authDomain: firebaseConfig.authDomain || "missing-firebase-auth-domain",
      projectId: firebaseConfig.projectId || "missing-firebase-project-id",
      appId: firebaseConfig.appId || "missing-firebase-app-id",
    });
export const auth = getAuth(app);
