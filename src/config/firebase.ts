import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA7r8VEYEm9tcILEtVz-mNdt_jLg5RlT8I",
  authDomain: "quizt1.firebaseapp.com",
  projectId: "quizt1",
  storageBucket: "quizt1.firebasestorage.app",
  messagingSenderId: "466236222404",
  appId: "1:466236222404:web:70fc38dd52c0fef3ecd291",
  measurementId: "G-MBEK2PWRW9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
