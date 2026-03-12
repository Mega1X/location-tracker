// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import { firebaseConfig } from './env.js';

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
