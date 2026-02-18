
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDBc1aa4n86MohUEX0wLMZINej7pLFpe34",
  authDomain: "key-drop-49821.firebaseapp.com",
  projectId: "key-drop-49821",
  storageBucket: "key-drop-49821.firebasestorage.app",
  messagingSenderId: "702214759889",
  appId: "1:702214759889:web:bede2a0dc7207811b8ecf0",
  measurementId: "G-EN1WBQ89X6"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);