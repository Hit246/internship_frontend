// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDc-itbnRjAT9SahVyauHB_cGNzcG9ukXE",
    authDomain: "yourtube-99f6d.firebaseapp.com",
    projectId: "yourtube-99f6d",
    storageBucket: "yourtube-99f6d.firebasestorage.app",
    messagingSenderId: "978397012098",
    appId: "1:978397012098:web:86a84a148675bf9d3c149b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };
