import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDceOzQlv1eetqLxgpL03QezDSQ74-Rrp4",
  authDomain: "quizt1.firebaseapp.com",
  projectId: "quizt1",
  storageBucket: "quizt1.appspot.com",
  messagingSenderId: "104884585468630320397",
  appId: "1:104884585468630320397:web:abcdef123456789"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;