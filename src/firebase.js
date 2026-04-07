import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBjJtqZ517Nm9dO9FPpDosCPiNQlZK1SBM",
  authDomain: "location-tracker-8145f.firebaseapp.com",
  databaseURL: "https://location-tracker-8145f-default-rtdb.firebaseio.com",
  projectId: "location-tracker-8145f",
  storageBucket: "location-tracker-8145f.firebasestorage.app",
  messagingSenderId: "800065087000",
  appId: "1:800065087000:web:db5df9a70a4a5d206fc56d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export for use in components
export { db };
export const config = firebaseConfig;
