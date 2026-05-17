// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js";

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDwPRWtEGGDsyIBdNHiVI4_u6ss0P9kYo0",
  authDomain: "zenbreak-app-fc557.firebaseapp.com",
  projectId: "zenbreak-app-fc557",
  storageBucket: "zenbreak-app-fc557.appspot.com",
  messagingSenderId: "936020929764",
  appId: "1:936020929764:web:1efd7675bae6eb7c6010f1",
  measurementId: "G-8WQ8MK35V2"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const storage = getStorage(app);

// Tu peux maintenant exporter `storage` si tu veux l'utiliser ailleurs
export { storage };
