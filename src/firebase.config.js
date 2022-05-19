import { initializeApp } from "firebase/app";
import {getFirestore} from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDXRZb4BK0DnKQfiQEmCmMXtn-0ng8EGSk",
  authDomain: "house-marketplace-app-f6af9.firebaseapp.com",
  projectId: "house-marketplace-app-f6af9",
  storageBucket: "house-marketplace-app-f6af9.appspot.com",
  messagingSenderId: "697380793344",
  appId: "1:697380793344:web:970707a498071c83b8bce5"
};

// Initialize Firebase
initializeApp(firebaseConfig);

export const db = getFirestore()
