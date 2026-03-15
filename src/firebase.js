import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBSXiZWea-cXvztxKv28YggNOJioqsBobU",
    authDomain: "pf-verbas.firebaseapp.com",
    projectId: "pf-verbas",
    storageBucket: "pf-verbas.firebasestorage.app",
    messagingSenderId: "1048653186555",
    appId: "1:1048653186555:web:2b7945d5e1cf3998b5f75e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
