
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-analytics.js";
  // *** 加入這行，導入 Firestore 功能 ***
  import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyATqm5kBEkK-Uu85c8YheWmvMacieVk6vE",
    authDomain: "eat88-ffcf4.firebaseapp.com",
    projectId: "eat88-ffcf4",
    storageBucket: "eat88-ffcf4.firebasestorage.app",
    messagingSenderId: "1005079872001",
    appId: "1:1005079872001:web:d87af233ad99e099217600",
    measurementId: "G-F8M09GFS7N"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);

  // *** 加入這行，取得 Firestore 資料庫實例 ***
const db = getFirestore(app);

// *** 最重要：導出 db 和需要的功能，讓其他檔案可以使用它們 ***
export { db, collection, getDocs, addDoc, serverTimestamp };