import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env
dotenv.config({ path: path.join(rootDir, '.env') });

function initFirebase() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firestore] Thiếu cấu hình Firebase trong .env (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)');
    return null;
  }

  try {
    // Xử lý xuống dòng cho private key trong .env
    privateKey = privateKey.replace(/\\n/g, '\n');

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      })
    });

    console.log('\x1b[32m✔\x1b[0m \x1b[1m[Firestore]\x1b[0m Kết nối database thành công');
    return getFirestore();
  } catch (error) {
    console.error('\x1b[31m✖\x1b[0m \x1b[1m[Firestore]\x1b[0m Lỗi kết nối:', error.message);
    return null;
  }
}

export const db = initFirebase();
