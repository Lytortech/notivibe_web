import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDa7FNwmjbfKXdJ_R_YMVDJn3vYdoDX-6w',
  authDomain: 'notivibe-2357c.firebaseapp.com',
  databaseURL: 'https://notivibe-2357c-default-rtdb.firebaseio.com',
  projectId: 'notivibe-2357c',
  storageBucket: 'notivibe-2357c.firebasestorage.app',
  messagingSenderId: '801277193945',
  appId: '1:801277193945:web:c729cd41534ed23eee58c8',
  measurementId: 'G-CXS1FYB3E4'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
