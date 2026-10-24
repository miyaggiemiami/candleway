import { randomUUID } from "node:crypto";
import { CollectionReference, DocumentData } from "firebase-admin/firestore";
import { getFirebaseDatabase, getFirebaseStorageBucket } from "./firebaseAdmin";

export function userCollection(userId: string, collectionName: string): CollectionReference<DocumentData> {
  return getFirebaseDatabase()
    .collection("users")
    .doc(userId)
    .collection(collectionName);
}

export function userDocument(userId: string, collectionName: string, documentId: string) {
  return userCollection(userId, collectionName).doc(documentId);
}

export async function storeAnalysisImage(userId: string, imageData: unknown): Promise<string | null> {
  if (typeof imageData !== "string" || !imageData.startsWith("data:")) return null;
  const match = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Analysis image must be a base64-encoded image");

  const [, contentType, encodedImage] = match;
  const buffer = Buffer.from(encodedImage, "base64");
  if (buffer.length === 0) throw new Error("Analysis image is empty");

  const bucket = getFirebaseStorageBucket();
  const objectPath = `users/${userId}/analyses/${randomUUID()}`;
  const downloadToken = randomUUID();
  await bucket.file(objectPath).save(buffer, {
    resumable: false,
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;
}
